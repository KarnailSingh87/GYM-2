import mongoose from 'mongoose'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../app.js'
import Member from '../models/Member.js'

let mongo

beforeAll(async () => {
  mongo = await MongoMemoryServer.create()
  const uri = mongo.getUri()
  await mongoose.connect(uri, { dbName: 'testdb' })
  // set env admin credentials for the test
  process.env.ADMIN_EMAIL = 'test@admin.com'
  process.env.ADMIN_PASSWORD = 'password'
  process.env.JWT_SECRET = 'testsecret'
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongo.stop()
})

afterEach(async () => {
  await Member.deleteMany({})
})

test('admin login and create member', async () => {
  const login = await request(app).post('/api/auth/login').send({ email: 'test@admin.com', password: 'password' })
  expect(login.status).toBe(200)
  const token = login.body.token
  expect(token).toBeTruthy()

  const res = await request(app).post('/api/members').set('Authorization', `Bearer ${token}`).send({ name: 'Alice', phone: '+1234567890', membershipType: 'monthly' })
  expect(res.status).toBe(201)
  const members = await Member.find()
  expect(members.length).toBe(1)
  expect(members[0].name).toBe('Alice')
})

test('otp rate limit prevents rapid sends', async () => {
  const login = await request(app).post('/api/auth/login').send({ email: 'test@admin.com', password: 'password' })
  const token = login.body.token
  // first create
  const r1 = await request(app).post('/api/members').set('Authorization', `Bearer ${token}`).send({ name: 'A', phone: '+199999', membershipType: 'monthly' })
  expect(r1.status).toBe(201)
  // immediate second should be rate limited
  const r2 = await request(app).post('/api/members').set('Authorization', `Bearer ${token}`).send({ name: 'B', phone: '+199999', membershipType: 'monthly' })
  expect(r2.status).toBe(429)
})
