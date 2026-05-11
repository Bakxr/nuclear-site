export function createMockReq({ method = 'GET', body = {}, query = {}, headers = {} } = {}) {
  return {
    method,
    body,
    query,
    headers,
    socket: { remoteAddress: '127.0.0.1' },
  };
}

export function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    ended: false,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
    end(payload) {
      this.body = payload;
      this.ended = true;
      return this;
    },
  };
}
