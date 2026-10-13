'use strict';

const { User } = require('../models');
const adminUsers = require('../controllers/adminUsersController');
const adminStats = require('../controllers/adminStatsController');

const response = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe('admin student API contract', () => {
  afterEach(() => jest.restoreAllMocks());

  test.each([
    [{ org_id: 'legacy-org-id' }, /Unsupported query parameter/],
    [{ role: 'student' }, /Unsupported query parameter/],
    [{ page: '0' }, /page must be a positive integer/],
    [{ limit: '101' }, /limit must be an integer between 1 and 100/],
    [{ status: 'deleted' }, /status must be active, inactive, or suspended/],
  ])('rejects unsupported or invalid list filters %#', async (query, expectedMessage) => {
    const findAndCountAll = jest.spyOn(User, 'findAndCountAll');
    const res = response();

    await adminUsers.list({ query }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(expectedMessage);
    expect(findAndCountAll).not.toHaveBeenCalled();
  });

  test('returns only the supported paginated student list fields', async () => {
    const rows = [{ id: 'student-1', email: 'student@example.test' }];
    const findAndCountAll = jest.spyOn(User, 'findAndCountAll').mockResolvedValue({ count: 21, rows });
    const res = response();

    await adminUsers.list({ query: { search: ' Sam ', status: 'active', page: '2', limit: '10' } }, res);

    expect(findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ role: 'student', status: 'active' }),
      limit: 10,
      offset: 10,
      attributes: expect.arrayContaining(['id', 'email', 'can_use_lab']),
    }));
    expect(res.json).toHaveBeenCalledWith({ users: rows, total: 21, page: 2, pages: 3 });
  });

  test('admin reporting returns aggregate student counts without account records', async () => {
    const counts = new Map([
      ['role:student', 12],
      ['role:student,status:active', 8],
      ['role:student,status:inactive', 2],
      ['role:student,status:suspended', 2],
      ['can_use_lab:true,role:student', 5],
      ['is_flagged:true,role:student', 1],
    ]);
    const count = jest.spyOn(User, 'count').mockImplementation(({ where }) => (
      Promise.resolve(counts.get(Object.entries(where).map(([key, value]) => `${key}:${value}`).sort().join(',')))
    ));
    const res = response();

    await adminStats.stats({}, res);

    expect(count).toHaveBeenCalledTimes(6);
    expect(count.mock.calls.every(([query]) => query.where.role === 'student')).toBe(true);
    const [payload] = res.json.mock.calls[0];
    expect(payload).toEqual(expect.objectContaining({
      totalUsers: 12,
      activeUsers: 8,
      inactiveUsers: 2,
      suspendedUsers: 2,
      labEnabledUsers: 5,
      flaggedUsers: 1,
      generatedAt: expect.any(String),
    }));
    expect(payload).not.toHaveProperty('users');
    expect(payload).not.toHaveProperty('emails');
    expect(Number.isNaN(Date.parse(payload.generatedAt))).toBe(false);
  });

  test.each([
    [{ name: 'Student', email: 'student@example.test', password: 'Strong!Pass1', student_id: 's-1', role: 'super_admin' }, 'role'],
    [{ name: 'Student', email: 'student@example.test', password: 'Strong!Pass1', student_id: 's-1', org_id: 'org-1' }, 'org_id'],
    [{ name: 'Student', email: 'student@example.test', password: 'Strong!Pass1', student_id: 's-1', department: ['EE'] }, 'department'],
  ])('rejects unsupported create fields and invalid field types %#', async (body, field) => {
    const findOne = jest.spyOn(User, 'findOne');
    const res = response();

    await adminUsers.create({ body }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toContain(field);
    expect(findOne).not.toHaveBeenCalled();
  });

  test('rejects extra password-reset fields', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue({ id: 'student-1' });
    const res = response();

    await adminUsers.resetPassword({ params: { id: 'student-1' }, body: { password: 'Strong!Pass1', role: 'super_admin' } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Only the password field is accepted' });
  });

  test('rejects unsupported bulk-import root and row fields', async () => {
    const findOne = jest.spyOn(User, 'findOne');
    const invalidRoot = response();
    await adminUsers.bulkImport({ body: { rows: [], org_id: 'org-1' } }, invalidRoot);

    expect(invalidRoot.status).toHaveBeenCalledWith(400);
    expect(findOne).not.toHaveBeenCalled();

    const invalidRow = response();
    await adminUsers.bulkImport({
      body: {
        rows: [{
          name: 'Student',
          email: 'student@example.test',
          password: 'Strong!Pass1',
          student_id: 's-1',
          role: 'super_admin',
        }],
      },
    }, invalidRow);

    expect(invalidRow.json).toHaveBeenCalledWith({
      results: [{ row: 1, status: 'error', email: 'student@example.test', error: 'Unsupported user field: role' }],
      created: 0,
      failed: 1,
    });
    expect(findOne).not.toHaveBeenCalled();
  });

  test.each(['resetPassword', 'forceLogout', 'suspend', 'unflagUser', 'setUserPermissions', 'remove'])(
    '%s cannot target a non-student account',
    async (action) => {
      const findOne = jest.spyOn(User, 'findOne').mockResolvedValue(null);
      const res = response();

      await adminUsers[action]({ params: { id: 'admin-id' }, body: {} }, res);

      expect(findOne).toHaveBeenCalledWith({ where: { id: 'admin-id', role: 'student' } });
      expect(res.status).toHaveBeenCalledWith(404);
    }
  );

  test('lab permission update rejects non-boolean and extra permission fields', async () => {
    const user = { id: 'student-1', can_use_lab: false, save: jest.fn() };
    jest.spyOn(User, 'findOne').mockResolvedValue(user);
    const res = response();

    await adminUsers.setUserPermissions({ params: { id: user.id }, body: { can_use_lab: 'false' } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(user.save).not.toHaveBeenCalled();
  });
});
