const mongoose = require("mongoose");
const util = require("util");

const redis = require("redis");

const redisUrl = "redis://127.0.0.1:6379";
const client = redis.createClient(redisUrl);

let exec = mongoose.Query.prototype.exec;
client.get = util.promisify(client.get);


mongoose.Query.prototype.cache = function () {
  this.useCache = true
  return this
}

mongoose.Query.prototype.exec = async function() {
  if (!this.useCache) {
    return exec.apply(this, arguments)
  }

  const key = JSON.stringify(
    Object.assign({}, this.getQuery(), {
      collection: this.mongooseCollection.name
    })
  );

  const cacheValue = await client.get(key);

  if (cacheValue) {
    const doc = JSON.parse(cacheValue);
    return Array.isArray(doc)
      ? doc.map(a => new this.model(a))
      : new this.model(doc);
  }

  const result = await exec.apply(this, arguments);
  client.set(key, JSON.stringify(result));

  return result;
};
