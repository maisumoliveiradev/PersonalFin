import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { detectContentType } from '../src/modules/attachments/attachment.ts';
import {
  buildTestServer,
  createInMemoryRepositories,
  sessionCookie,
} from './support/test-server.ts';
import { sessions } from './support/users.ts';

let repositories = createInMemoryRepositories();
let server = buildTestServer({ sessions, repositories });
const asAna = { cookie: sessionCookie('ana-token') };

beforeEach(async () => {
  await server.close();
  repositories = createInMemoryRepositories();
  server = buildTestServer({ sessions, repositories });
});

afterAll(async () => {
  await server.close();
});

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const PDF = Buffer.from('%PDF-1.7\n%âãÏÓ\n', 'latin1');
const HTML = Buffer.from('<html><script>alert(1)</script></html>');

function call(method: 'GET' | 'POST' | 'DELETE', url: string, payload?: object) {
  return server.inject({
    method,
    url,
    headers: asAna,
    ...(payload === undefined ? {} : { payload }),
  });
}

async function setUp() {
  const spaceId: string = (await call('POST', '/financial-spaces', { name: 'Casa' })).json().id;
  const base = `/financial-spaces/${spaceId}`;
  const categories = (await call('GET', `${base}/categories`)).json().items as {
    id: string;
    name: string;
  }[];
  const transaction = (
    await call('POST', `${base}/transactions`, {
      type: 'expense',
      description: 'Farmácia',
      amountMinor: 4_530,
      financialDate: '2026-10-05',
      categoryId: categories.find((category) => category.name === 'Saúde')?.id,
    })
  ).json();
  const upload = (fileName: string, content: Buffer) =>
    call('POST', `${base}/transactions/${transaction.id}/attachments`, {
      fileName,
      contentBase64: content.toString('base64'),
    });
  return { base, transaction, upload };
}

describe('attachments', () => {
  it('detects the content type from the bytes', () => {
    expect(detectContentType(PNG)).toBe('image/png');
    expect(detectContentType(PDF)).toBe('application/pdf');
    expect(detectContentType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(detectContentType(HTML)).toBeNull();
  });

  it('stores, lists, serves, and removes attachments with an audit trail', async () => {
    const { base, transaction, upload } = await setUp();

    const created = await upload('nota.pdf', PDF);

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      fileName: 'nota.pdf',
      contentType: 'application/pdf',
      sizeBytes: PDF.length,
      transactionId: transaction.id,
    });
    const list = await call('GET', `${base}/transactions/${transaction.id}/attachments`);
    expect(list.json().items).toHaveLength(1);
    const content = await call('GET', `${base}/attachments/${created.json().id}/content`);
    expect(content.headers['content-type']).toBe('application/pdf');
    expect(content.headers['x-content-type-options']).toBe('nosniff');
    expect(content.rawPayload.equals(PDF)).toBe(true);

    const removed = await call('DELETE', `${base}/attachments/${created.json().id}`);
    expect(removed.statusCode).toBe(204);
    expect((await call('GET', `${base}/attachments/${created.json().id}/content`)).statusCode).toBe(
      404,
    );
    expect(repositories.audit.events.map((event) => `${event.entityType}:${event.action}`)).toEqual(
      ['attachment:create', 'attachment:delete'],
    );
  });

  it('rejects files that are not images or PDFs, whatever their name', async () => {
    const { upload } = await setUp();
    const response = await upload('nota.pdf', HTML);
    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('ATTACHMENT_TYPE_NOT_ALLOWED');
  });

  it('limits attachments per transaction', async () => {
    const { upload } = await setUp();
    for (let index = 0; index < 10; index += 1) {
      expect((await upload(`foto-${index}.png`, PNG)).statusCode).toBe(201);
    }
    expect((await upload('demais.png', PNG)).json().error.code).toBe('ATTACHMENT_LIMIT_REACHED');
  });
});
