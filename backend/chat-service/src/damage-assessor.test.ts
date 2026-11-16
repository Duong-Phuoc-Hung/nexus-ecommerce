import assert from 'node:assert/strict';
import test from 'node:test';
import { GenerateContentParameters } from '@google/genai';
import { DamageAssessment, DamageImageInput } from './application/ports/IDamageAssessor';
import {
  DAMAGE_RESPONSE_SCHEMA,
  GeminiDamageAssessor,
} from './infrastructure/ai/GeminiDamageAssessor';
import { MockDamageAssessor } from './infrastructure/ai/MockDamageAssessor';

export const imageInput: DamageImageInput = {
  imageBase64:
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=',
  mimeType: 'image/png',
  expectedItem: 'Ly thủy tinh',
};

const assessment: DamageAssessment = {
  is_damaged: true,
  damage_type: 'NỨT_VỠ',
  severity: 'CAO',
  summary: 'Phát hiện vết nứt trên sản phẩm.',
};

test('BE-01: image bytes, JSON schema and 250-token configuration reach the SDK', async () => {
  let request: GenerateContentParameters | undefined;
  const assessor = new GeminiDamageAssessor({
    apiKey: 'test-key',
    modelName: 'test-supported-model',
    client: {
      models: {
        generateContent: async (input) => {
          request = input;
          return { text: JSON.stringify(assessment) };
        },
      },
    },
  });
  assert.deepEqual(await assessor.assessImage(imageInput), assessment);
  assert.equal(request?.model, 'test-supported-model');
  assert.equal(request?.config?.maxOutputTokens, 250);
  assert.equal(request?.config?.responseMimeType, 'application/json');
  assert.deepEqual(request?.config?.responseSchema, DAMAGE_RESPONSE_SCHEMA);
  assert.deepEqual(request?.contents, [
    {
      role: 'user',
      parts: [
        { text: 'Sản phẩm đặt mua để đối chiếu: Ly thủy tinh' },
        { inlineData: { data: imageInput.imageBase64, mimeType: 'image/png' } },
      ],
    },
  ]);
  assert.equal(request?.config?.httpOptions?.retryOptions?.attempts, 1);
});

test('BE-01: missing key and invalid image inputs return explicitly labelled offline data', async () => {
  const mock = await new MockDamageAssessor().assessImage(imageInput);
  assert.match(mock.summary, /MOCK/);
  assert.deepEqual(Object.keys(mock).sort(), ['damage_type', 'is_damaged', 'severity', 'summary']);
  const assessor = new GeminiDamageAssessor({ apiKey: '' });
  assert.deepEqual(await assessor.assessImage(imageInput), mock);
  for (const input of [
    null,
    undefined,
    {},
    { ...imageInput, mimeType: 'video/mp4' },
    { ...imageInput, imageBase64: 'not base64' },
  ]) {
    assert.deepEqual(await assessor.assessImage(input as DamageImageInput), mock);
  }
});

test('BE-01: SDK errors, blocked/truncated JSON and invalid field values fall back safely', async () => {
  const mock = await new MockDamageAssessor().assessImage(imageInput);
  const invalid = [
    undefined,
    '',
    '{"is_damaged":',
    '{}',
    'null',
    '[]',
    JSON.stringify({ ...assessment, is_damaged: 'true' }),
    JSON.stringify({ ...assessment, damage_type: 'BROKEN' }),
    JSON.stringify({ ...assessment, severity: 'HIGH' }),
    JSON.stringify({ ...assessment, summary: '' }),
    JSON.stringify({ ...assessment, summary: 'x'.repeat(501) }),
    JSON.stringify({ ...assessment, unexpected: true }),
    JSON.stringify({ ...assessment, damage_type: 'BÌNH_THƯỜNG' }),
  ];
  for (const text of invalid) {
    const assessor = new GeminiDamageAssessor({
      client: { models: { generateContent: async () => ({ text }) } },
    });
    assert.deepEqual(await assessor.assessImage(imageInput), mock);
  }
  for (const status of [404, 429, 500]) {
    const assessor = new GeminiDamageAssessor({
      client: {
        models: {
          generateContent: async () => {
            throw new Error(String(status));
          },
        },
      },
    });
    assert.deepEqual(await assessor.assessImage(imageInput), mock);
  }
});

test('BE-01: deadline aborts hanging calls and returns fallback without waiting for the SDK', async () => {
  let signal: AbortSignal | undefined;
  const assessor = new GeminiDamageAssessor({
    timeoutMs: 20,
    client: {
      models: {
        generateContent: (request) => {
          signal = request.config?.abortSignal;
          return new Promise(() => {});
        },
      },
    },
  });
  const start = performance.now();
  const result = await assessor.assessImage(imageInput);
  assert.match(result.summary, /MOCK/);
  assert.equal(signal?.aborted, true);
  assert.ok(performance.now() - start < 1000);
});
