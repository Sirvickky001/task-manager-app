'use strict';

const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// In-memory task store
let tasks = [];
let nextId = 1;

// Health endpoint (ArgoCD + Prometheus will use this)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Metrics endpoint (Prometheus scrape target)
app.get('/metrics', (req, res) => {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'done').length;
  const pending = total - done;
  res.set('Content-Type', 'text/plain');
  res.send(
    `# HELP taskflow_tasks_total Total number of tasks\n` +
    `# TYPE taskflow_tasks_total gauge\n` +
    `taskflow_tasks_total ${total}\n` +
    `# HELP taskflow_tasks_pending Pending tasks\n` +
    `# TYPE taskflow_tasks_pending gauge\n` +
    `taskflow_tasks_pending ${pending}\n` +
    `# HELP taskflow_tasks_done Completed tasks\n` +
    `# TYPE taskflow_tasks_done gauge\n` +
    `taskflow_tasks_done ${done}\n`
  );
});

// GET /api/tasks — list all tasks
app.get('/api/tasks', (req, res) => {
  res.json(tasks);
});

// POST /api/tasks — create a task
app.post('/api/tasks', (req, res) => {
  const { title, priority } = req.body;
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'title is required' });
  }
  const task = {
    id: nextId++,
    title: title.trim(),
    priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  res.status(201).json(task);
});

// PATCH /api/tasks/:id — update status
app.patch('/api/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const task = tasks.find(t => t.id === id);
  if (!task) return res.status(404).json({ error: 'task not found' });
  const { status } = req.body;
  if (!['pending', 'in-progress', 'done'].includes(status)) {
    return res.status(400).json({ error: 'invalid status' });
  }
  task.status = status;
  res.json(task);
});

// DELETE /api/tasks/:id — delete a task
app.delete('/api/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return res.status(404).json({ error: 'task not found' });
  tasks.splice(index, 1);
  res.status(204).send();
});

module.exports = app;
