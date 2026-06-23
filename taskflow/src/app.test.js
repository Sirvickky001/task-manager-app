'use strict';

const request = require('supertest');
const app = require('./app');

describe('Health + Metrics', () => {
  test('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
  });

  test('GET /metrics returns prometheus format', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('taskflow_tasks_total');
    expect(res.text).toContain('taskflow_tasks_pending');
    expect(res.text).toContain('taskflow_tasks_done');
  });
});

describe('GET /api/tasks', () => {
  test('returns empty array initially', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('POST /api/tasks', () => {
  test('creates a task with valid data', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'Deploy to Minikube', priority: 'high' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Deploy to Minikube');
    expect(res.body.priority).toBe('high');
    expect(res.body.status).toBe('pending');
    expect(res.body.id).toBeDefined();
  });

  test('defaults to medium priority', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'Write Dockerfile' });
    expect(res.status).toBe(201);
    expect(res.body.priority).toBe('medium');
  });

  test('rejects empty title', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('rejects missing title', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ priority: 'low' });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/tasks/:id', () => {
  let taskId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'Test task', priority: 'low' });
    taskId = res.body.id;
  });

  test('updates status to in-progress', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .send({ status: 'in-progress' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in-progress');
  });

  test('updates status to done', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .send({ status: 'done' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
  });

  test('rejects invalid status', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .send({ status: 'cancelled' });
    expect(res.status).toBe(400);
  });

  test('returns 404 for non-existent task', async () => {
    const res = await request(app)
      .patch('/api/tasks/99999')
      .send({ status: 'done' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/tasks/:id', () => {
  let taskId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'Task to delete', priority: 'medium' });
    taskId = res.body.id;
  });

  test('deletes an existing task', async () => {
    const res = await request(app).delete(`/api/tasks/${taskId}`);
    expect(res.status).toBe(204);
  });

  test('task no longer appears after deletion', async () => {
    await request(app).delete(`/api/tasks/${taskId}`);
    const res = await request(app).get('/api/tasks');
    const found = res.body.find(t => t.id === taskId);
    expect(found).toBeUndefined();
  });

  test('returns 404 for non-existent task', async () => {
    const res = await request(app).delete('/api/tasks/99999');
    expect(res.status).toBe(404);
  });
});
