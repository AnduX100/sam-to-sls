'use strict';
const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

/**
 * Inserta un item sencillo en DynamoDB (prueba de conectividad en VPC aislada)
 * y devuelve lo guardado.
 */
exports.hello = async () => {
  try {
    const item = {
      pk: 'hello',
      ts: Date.now()
    };

    await ddb.put({
      TableName: TABLE_NAME,
      Item: item
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, saved: item })
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
