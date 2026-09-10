import { RecordsService } from './records.service';

describe('RecordsService', () => {
  let service: RecordsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      acceptedRecord: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'r-1',
            source: 'alpha',
            recordedAt: new Date(),
            value: 42,
            status: 'OK',
            version: 2,
            _count: { history: 1 },
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'r-1') {
            return Promise.resolve({
              id: 'r-1',
              source: 'alpha',
              version: 2,
              history: [
                {
                  id: 'h-1',
                  acceptedRecordId: 'r-1',
                  version: 1,
                  value: 10,
                  status: 'OK',
                },
              ],
            });
          }
          return Promise.resolve(null);
        }),
      },
    };

    service = new RecordsService(mockPrisma);
  });

  it('findRecords includes history count in results', async () => {
    const res = await service.findRecords({});
    expect(res.data[0]._count.history).toBe(1);
    expect(mockPrisma.acceptedRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          _count: {
            select: { history: true },
          },
        },
      }),
    );
  });

  it('getRecordHistory returns masterId and ordered child revisions', async () => {
    const res = await service.getRecordHistory('r-1');
    expect(res).not.toBeNull();
    expect(res?.masterId).toBe('r-1');
    expect(res?.history).toHaveLength(1);
    expect(res?.history[0].id).toBe('h-1');
  });

  it('getRecordHistory returns null if record does not exist', async () => {
    const res = await service.getRecordHistory('non-existent');
    expect(res).toBeNull();
  });
});
