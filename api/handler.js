'use strict';
const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

// Utilidad para respuestas uniformes + CORS
const res = (statusCode, data) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  },
  body: JSON.stringify(data)
});

const randomId = () => {
  // Node.js 18 tiene crypto.randomUUID; si no está, fallback simple
  try {
    return require('crypto').randomUUID();
  } catch {
    return 'id-' + Math.random().toString(36).slice(2);
  }
};

/**
 * POST /items
 * body: { name: string, ...payload }
 * Crea un ítem con pk = <uuid>
 */
exports.createItem = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    if (!body || typeof body !== 'object') {
      return res(400, { ok: false, error: 'Invalid JSON body' });
    }
    if (!body.name) {
      return res(400, { ok: false, error: 'Field "name" is required' });
    }

    const item = {
      pk: randomId(),
      name: body.name,
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await ddb.put({ TableName: TABLE_NAME, Item: item, ConditionExpression: 'attribute_not_exists(pk)' }).promise();
    return res(201, { ok: true, item });
  } catch (err) {
    return res(500, { ok: false, error: err.message });
  }
};

/**
 * GET /items/{id}
 */
exports.getItem = async (event) => {
  try {
    const id = event.pathParameters?.id;
    if (!id) return res(400, { ok: false, error: 'Missing id' });

    const out = await ddb.get({ TableName: TABLE_NAME, Key: { pk: id } }).promise();
    if (!out.Item) return res(404, { ok: false, error: 'Not found' });

    return res(200, { ok: true, item: out.Item });
  } catch (err) {
    return res(500, { ok: false, error: err.message });
  }
};

/**
 * PUT /items/{id}
 * body: { ...partial fields }
 */
exports.updateItem = async (event) => {
  try {
    const id = event.pathParameters?.id;
    if (!id) return res(400, { ok: false, error: 'Missing id' });

    const body = event.body ? JSON.parse(event.body) : {};
    if (!body || typeof body !== 'object') {
      return res(400, { ok: false, error: 'Invalid JSON body' });
    }

    // Construye UpdateExpression dinámico (ignora pk/createdAt)
    const allowed = Object.keys(body).filter(k => !['pk', 'createdAt'].includes(k));
    if (allowed.length === 0) return res(400, { ok: false, error: 'No updatable fields' });

    const names = {};
    const values = {};
    const sets = [];

    allowed.forEach((k, i) => {
      names[`#k${i}`] = k;
      values[`:v${i}`] = body[k];
      sets.push(`#k${i} = :v${i}`);
    });

    names['#updatedAt'] = 'updatedAt';
    values[':updatedNow'] = new Date().toISOString();
    sets.push('#updatedAt = :updatedNow');

    const out = await ddb.update({
      TableName: TABLE_NAME,
      Key: { pk: id },
      UpdateExpression: 'SET ' + sets.join(', '),
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ConditionExpression: 'attribute_exists(pk)',
      ReturnValues: 'ALL_NEW'
    }).promise();

    return res(200, { ok: true, item: out.Attributes });
  } catch (err) {
    // ConditionalCheckFailedException => no existe
    const code = err.code === 'ConditionalCheckFailedException' ? 404 : 500;
    return res(code, { ok: false, error: err.message });
  }
};

/**
 * DELETE /items/{id}
 */
exports.deleteItem = async (event) => {
  try {
    const id = event.pathParameters?.id;
    if (!id) return res(400, { ok: false, error: 'Missing id' });

    await ddb.delete({
      TableName: TABLE_NAME,
      Key: { pk: id },
      ConditionExpression: 'attribute_exists(pk)'
    }).promise();

    return res(204, { ok: true });
  } catch (err) {
    const code = err.code === 'ConditionalCheckFailedException' ? 404 : 500;
    return res(code, { ok: false, error: err.message });
  }
};

/**
 * GET /items
 * Nota: Scan para demo. En producción, mejor Query con índices.
 */
exports.listItems = async () => {
  try {
    const out = await ddb.scan({ TableName: TABLE_NAME, Limit: 100 }).promise();
    return res(200, { ok: true, count: out.Count ?? 0, items: out.Items ?? [] });
  } catch (err) {
    return res(500, { ok: false, error: err.message });
  }
};
