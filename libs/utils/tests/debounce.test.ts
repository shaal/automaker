import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce, throttle } from '../src/debounce.js';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should delay function execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should reset timer on subsequent calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(50);
    debounced(); // Reset timer
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments to the function', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('arg1', 'arg2');
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should use the latest arguments when called multiple times', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('first');
    debounced('second');
    debounced('third');
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('third');
  });

  describe('leading option', () => {
    it('should call function immediately when leading is true', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { leading: true });

      debounced();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not call again until wait time has passed', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { leading: true, trailing: false });

      debounced();
      debounced();
      debounced();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      debounced();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should call both leading and trailing when both are true', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { leading: true, trailing: true });

      debounced('leading');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenLastCalledWith('leading');

      debounced('trailing');
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith('trailing');
    });
  });

  describe('trailing option', () => {
    it('should not call on trailing edge when trailing is false', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { trailing: false });

      debounced();
      vi.advanceTimersByTime(100);

      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('maxWait option', () => {
    it('should invoke function after maxWait even with continuous calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { maxWait: 200 });

      // Call continuously every 50ms
      debounced();
      vi.advanceTimersByTime(50);
      debounced();
      vi.advanceTimersByTime(50);
      debounced();
      vi.advanceTimersByTime(50);
      debounced();
      vi.advanceTimersByTime(50);

      // After 200ms, maxWait should trigger
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should throw error if maxWait is less than wait', () => {
      const fn = vi.fn();
      expect(() => debounce(fn, 100, { maxWait: 50 })).toThrow(
        'maxWait must be greater than or equal to wait'
      );
    });
  });

  describe('cancel method', () => {
    it('should cancel pending invocation', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced.cancel();
      vi.advanceTimersByTime(100);

      expect(fn).not.toHaveBeenCalled();
    });

    it('should reset state after cancel', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('first');
      debounced.cancel();
      debounced('second');
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('second');
    });
  });

  describe('flush method', () => {
    it('should immediately invoke pending function', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('value');
      expect(fn).not.toHaveBeenCalled();

      debounced.flush();
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('value');
    });

    it('should not invoke if no pending call', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced.flush();
      expect(fn).not.toHaveBeenCalled();
    });

    it('should cancel timer after flush', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced.flush();
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('pending method', () => {
    it('should return true when there is a pending invocation', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      expect(debounced.pending()).toBe(false);
      debounced();
      expect(debounced.pending()).toBe(true);
    });

    it('should return false after invocation', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      vi.advanceTimersByTime(100);
      expect(debounced.pending()).toBe(false);
    });

    it('should return false after cancel', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced.cancel();
      expect(debounced.pending()).toBe(false);
    });
  });
});

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should invoke function immediately by default', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should not invoke again before wait time', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    throttled();
    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should invoke on trailing edge with latest args', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled('first');
    expect(fn).toHaveBeenCalledWith('first');

    throttled('second');
    throttled('third');
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('third');
  });

  it('should respect leading option', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100, { leading: false });

    throttled();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should respect trailing option', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100, { trailing: false });

    throttled('first');
    throttled('second');
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('first');
  });

  it('should invoke at regular intervals during continuous calls', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    // Simulate continuous calls every 25ms for 250ms
    for (let i = 0; i < 10; i++) {
      throttled(i);
      vi.advanceTimersByTime(25);
    }

    // Should be called at: 0ms (leading), 100ms, 200ms
    // Plus one trailing call after the loop
    expect(fn.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('should have cancel, flush, and pending methods', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    expect(typeof throttled.cancel).toBe('function');
    expect(typeof throttled.flush).toBe('function');
    expect(typeof throttled.pending).toBe('function');
  });

  it('should cancel pending invocation', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100, { leading: false });

    throttled();
    throttled.cancel();
    vi.advanceTimersByTime(100);

    expect(fn).not.toHaveBeenCalled();
  });
});
