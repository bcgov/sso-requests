import isUndefined from 'lodash.isundefined';

export const expressyApiRouter = (app) => {
  // since `lambda-api-router` is not 100% compatible with Express.js syntax
  // mock the expected behaviour in the first middleware.
  app._res.redirect = function redirect(url: string) {
    app._res.headers({ Location: url }).status(301).send();
  };

  app._res.set = app._res.headers;

  app.use = function use(fn) {
    this._routes.push({
      type: 'middleware',
      fn,
    });
  };

  app._routes.push({
    type: 'middleware',
    fn: (req) => {
      try {
        req.body = JSON.parse(req.body);
      } catch {}
    },
  });

  app.listen = async function listen(event, context) {
    event = {
      ...event,
      query: event.queryStringParameters,
    };

    let matched = false;
    for (let i = 0; i < this._routes.length; i++) {
      const { type, route, middleware, fn } = this._routes[i];
      if (type === 'middleware') {
        const middRes = await fn(event, this._res);
        if (middRes === false) {
          matched = true;
          break;
        }

        continue;
      }

      const match = route.match(event);
      if (match) {
        event.params = match.params;
        matched = true;
        if (!isUndefined(middleware)) {
          middleware(event, this._res);
        }
        await fn(event, this._res);
        break;
      }
    }

    if (!matched) {
      return {
        statusCode: 404,
        body: '404 The incoming request did not match any known routes.',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      };
    }

    return this._response;
  };
  // end of mocking behaviours.
};
