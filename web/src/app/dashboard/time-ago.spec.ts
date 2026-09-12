import { timeAgo } from './time-ago';

describe('timeAgo', () => {
  const now = new Date('2026-09-12T12:00:00.000Z');

  it('reports just now for anything under a minute old', () => {
    expect(timeAgo(new Date('2026-09-12T11:59:30.000Z'), now)).toBe('Just now');
  });

  it('reports minutes for under an hour', () => {
    expect(timeAgo(new Date('2026-09-12T11:45:00.000Z'), now)).toBe('15 minutes ago');
  });

  it('uses singular units', () => {
    expect(timeAgo(new Date('2026-09-12T11:59:00.000Z'), now)).toBe('1 minute ago');
    expect(timeAgo(new Date('2026-09-12T11:00:00.000Z'), now)).toBe('1 hour ago');
  });

  it('reports hours for under a day', () => {
    expect(timeAgo(new Date('2026-09-12T09:00:00.000Z'), now)).toBe('3 hours ago');
  });

  it('reports "Yesterday" for exactly one day ago', () => {
    expect(timeAgo(new Date('2026-09-11T12:00:00.000Z'), now)).toBe('Yesterday');
  });

  it('reports days for under a week', () => {
    expect(timeAgo(new Date('2026-09-09T12:00:00.000Z'), now)).toBe('3 days ago');
  });

  it('reports weeks for under five weeks', () => {
    expect(timeAgo(new Date('2026-08-29T12:00:00.000Z'), now)).toBe('2 weeks ago');
  });

  it('reports months for under a year', () => {
    expect(timeAgo(new Date('2026-06-12T12:00:00.000Z'), now)).toBe('3 months ago');
  });

  it('reports years beyond that', () => {
    expect(timeAgo(new Date('2024-09-12T12:00:00.000Z'), now)).toBe('2 years ago');
  });

  it('accepts an ISO string as well as a Date', () => {
    expect(timeAgo('2026-09-12T11:00:00.000Z', now)).toBe('1 hour ago');
  });
});
