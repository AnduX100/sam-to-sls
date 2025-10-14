'use strict';
exports.hello = async () => {
  return { statusCode: 200, body: JSON.stringify({ ok: true, msg: 'hello' }) };
  // En el Paso 3 conectaremos a DynamoDB.
};
