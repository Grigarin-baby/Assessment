import { DateNormalizerService } from './date-normalizer.service';

describe('DateNormalizerService', () => {
  let service: DateNormalizerService;

  beforeEach(() => {
    service = new DateNormalizerService();
  });

  it('should parse standard ISO 8601 UTC date strings', () => {
    const res = service.normalize('2026-03-14T09:12:00Z');
    expect(res).not.toBeNull();
    expect(res?.toISOString()).toBe('2026-03-14T09:12:00.000Z');
  });

  it('should parse ISO 8601 strings with positive offset', () => {
    const res = service.normalize('2026-03-14T14:42:00+05:30');
    expect(res).not.toBeNull();
    expect(res?.toISOString()).toBe('2026-03-14T09:12:00.000Z');
  });

  it('should parse numeric Unix Epoch in seconds', () => {
    // 1773479520 -> 2026-03-14T09:12:00.000Z
    const res = service.normalize(1773479520);
    expect(res).not.toBeNull();
    expect(res?.toISOString()).toBe('2026-03-14T09:12:00.000Z');
  });

  it('should parse numeric Unix Epoch in milliseconds', () => {
    const res = service.normalize(1773479520000);
    expect(res).not.toBeNull();
    expect(res?.toISOString()).toBe('2026-03-14T09:12:00.000Z');
  });

  it('should parse standard SQL datetime strings', () => {
    const res = service.normalize('2026-03-14 09:12:00');
    expect(res).not.toBeNull();
  });

  it('should reject invalid calendar dates like 2026-02-31', () => {
    const res = service.normalize('2026-02-31T09:00:00Z');
    expect(res).toBeNull();
  });

  it('should reject unparseable garbage strings', () => {
    expect(service.normalize('invalid-date-string')).toBeNull();
    expect(service.normalize('')).toBeNull();
    expect(service.normalize('   ')).toBeNull();
    expect(service.normalize(null)).toBeNull();
  });
});
