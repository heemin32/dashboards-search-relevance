/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { IRouter } from '../../../../src/core/server';
import { ServiceEndpoints } from '../../common';
import {
  MAX_RATING_ADJUSTMENTS,
  registerSearchRelevanceRoutes,
} from './search_relevance_route_service';

const createMockRouter = () =>
  ({
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  }) as unknown as IRouter;

const getJudgmentCreateRouteSchema = (router: IRouter) => {
  const putCalls = (router.put as jest.Mock).mock.calls;
  const judgmentRoute = putCalls.find(([config]) => config.path === ServiceEndpoints.Judgments);

  if (!judgmentRoute) {
    throw new Error('Judgment create route was not registered');
  }

  return judgmentRoute[0].validate.body;
};

// Look up the params schema for an id-scoped route registered via `method` at `path`.
const getParamsSchema = (router: IRouter, method: 'put' | 'post', path: string) => {
  const calls = (router[method] as jest.Mock).mock.calls;
  const route = calls.find(([config]) => config.path === path);

  if (!route) {
    throw new Error(`Route not registered: ${method.toUpperCase()} ${path}`);
  }

  return route[0].validate.params;
};

describe('registerSearchRelevanceRoutes', () => {
  describe('judgment create route validation', () => {
    let bodySchema: ReturnType<typeof getJudgmentCreateRouteSchema>;

    beforeEach(() => {
      const router = createMockRouter();
      registerSearchRelevanceRoutes(router, false);
      bodySchema = getJudgmentCreateRouteSchema(router);
    });

    it('accepts tokenLimit as a number, matching the client payload', () => {
      const payload = {
        name: 'test judgment',
        type: 'LLM',
        querySetId: 'qs-1',
        searchConfigurationList: ['sc-1'],
        size: 5,
        modelId: 'model-1',
        tokenLimit: 1000,
      };

      expect(bodySchema.validate(payload)).toEqual(payload);
    });

    it('rejects non-numeric tokenLimit values', () => {
      expect(() =>
        bodySchema.validate({
          name: 'test judgment',
          type: 'LLM',
          tokenLimit: 'not-a-number',
        })
      ).toThrow();
    });
  });

  // The id from these routes is interpolated into the backend transport.request path, so it must
  // reject path separators and encoded traversal before it can reach an unintended endpoint.
  describe('id-scoped route param validation', () => {
    let router: IRouter;

    beforeEach(() => {
      router = createMockRouter();
      registerSearchRelevanceRoutes(router, false);
    });

    const idScopedRoutes: Array<['put' | 'post', string]> = [
      ['put', `${ServiceEndpoints.Judgments}/{id}`],
      ['post', `${ServiceEndpoints.JudgmentRetry}/{id}`],
    ];

    it.each(idScopedRoutes)('accepts a UUID-shaped id for %s %s', (method, path) => {
      const params = getParamsSchema(router, method, path);
      const id = '550e8400-e29b-41d4-a716-446655440000';
      expect(params.validate({ id })).toEqual({ id });
    });

    it.each(idScopedRoutes)(
      'rejects an id with encoded path traversal for %s %s',
      (method, path) => {
        const params = getParamsSchema(router, method, path);
        expect(() => params.validate({ id: '..%2F..%2F_cluster%2Fsettings' })).toThrow();
      }
    );

    it.each(idScopedRoutes)('rejects an id with a raw slash for %s %s', (method, path) => {
      const params = getParamsSchema(router, method, path);
      expect(() => params.validate({ id: 'foo/_cluster/settings' })).toThrow();
    });
  });

  describe('manual rating update route validation', () => {
    let bodySchema: any;

    beforeEach(() => {
      const router = createMockRouter();
      registerSearchRelevanceRoutes(router, false);
      const route = (router.put as jest.Mock).mock.calls.find(
        ([config]) => config.path === `${ServiceEndpoints.Judgments}/{id}`
      );
      bodySchema = route[0].validate.body;
    });

    const withRating = (rating: unknown) => ({
      judgmentRatings: [{ query: 'q', ratings: [{ docId: '1', rating }] }],
    });

    it('accepts ratings in [0, 1] as numbers or numeric strings', () => {
      expect(bodySchema.validate(withRating(0))).toEqual(withRating(0));
      expect(bodySchema.validate(withRating(1))).toEqual(withRating(1));
      expect(bodySchema.validate(withRating('0.5'))).toEqual(withRating(0.5));
    });

    it.each(['banana', -5, 999, 'NaN', 'Infinity', '-Infinity', 1.5, -0.1, '=1+1', ''])(
      'rejects rating %p',
      (rating) => {
        expect(() => bodySchema.validate(withRating(rating))).toThrow();
      }
    );

    it('accepts exactly MAX_RATING_ADJUSTMENTS ratings across queries', () => {
      const half = MAX_RATING_ADJUSTMENTS / 2;
      const ratings = (n: number) =>
        Array.from({ length: n }, (_, i) => ({ docId: `${i}`, rating: 0.5 }));
      expect(() =>
        bodySchema.validate({
          judgmentRatings: [
            { query: 'a', ratings: ratings(half) },
            { query: 'b', ratings: ratings(half) },
          ],
        })
      ).not.toThrow();
    });

    it('rejects more than MAX_RATING_ADJUSTMENTS ratings in one query', () => {
      const ratings = Array.from({ length: MAX_RATING_ADJUSTMENTS + 1 }, (_, i) => ({
        docId: `${i}`,
        rating: 0.5,
      }));
      expect(() => bodySchema.validate({ judgmentRatings: [{ query: 'q', ratings }] })).toThrow();
    });

    it('rejects more than MAX_RATING_ADJUSTMENTS ratings spread across queries', () => {
      const ratings = Array.from({ length: MAX_RATING_ADJUSTMENTS / 2 + 1 }, (_, i) => ({
        docId: `${i}`,
        rating: 0.5,
      }));
      expect(() =>
        bodySchema.validate({
          judgmentRatings: [
            { query: 'a', ratings },
            { query: 'b', ratings },
          ],
        })
      ).toThrow(/at most 1000 ratings/);
    });
  });
});
