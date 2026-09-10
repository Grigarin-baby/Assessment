import { RejectionsService } from './rejections.service';

describe('RejectionsService', () => {
  let service: RejectionsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      rejectedRecord: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'rej-1',
            originalId: 'r-1',
            rawPayload: JSON.stringify({ id: 'r-1', value: 99 }),
            primaryReason: 'DUPLICATE_ID_CONFLICT',
            allReasons: JSON.stringify(['DUPLICATE_ID_CONFLICT']),
            acceptedRecordId: 'r-1',
            acceptedRecord: {
              id: 'r-1',
              value: 42,
              status: 'OK',
            },
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'rej-1') {
            return Promise.resolve({
              id: 'rej-1',
              originalId: 'r-1',
              rawPayload: JSON.stringify({ id: 'r-1', value: 99 }),
              primaryReason: 'DUPLICATE_ID_CONFLICT',
              allReasons: JSON.stringify(['DUPLICATE_ID_CONFLICT']),
              acceptedRecordId: 'r-1',
              acceptedRecord: {
                id: 'r-1',
                value: 42,
                status: 'OK',
              },
            });
          }
          return Promise.resolve(null);
        }),
      },
    };

    service = new RejectionsService(mockPrisma);
  });

  it('findRejections eager-loads acceptedRecord relation', async () => {
    const res = await service.findRejections({});
    expect(res.data[0].acceptedRecord).toBeDefined();
    expect(res.data[0].acceptedRecord?.id).toBe('r-1');
    expect(res.data[0].rawPayload.value).toBe(99);
    expect(mockPrisma.rejectedRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          acceptedRecord: true,
        },
      }),
    );
  });

  it('getRejectionById eager-loads acceptedRecord relation', async () => {
    const res = await service.getRejectionById('rej-1');
    expect(res).not.toBeNull();
    expect(res?.acceptedRecord?.value).toBe(42);
  });
});
