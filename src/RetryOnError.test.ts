import { RetryOnError } from './RetryOnError';
import {
  Observable,
  throwError,
  of
} from 'rxjs';

describe(RetryOnError.name, () => {
  it('should retry the decorated method when an error is thrown', async () => {
    // Define a class with a decorated method that returns an error the first time it is called
    let count = 0;

    class TestClass {
      @RetryOnError()
      testMethod(): Observable<number> {
        count++;
        if (count === 1) {
          return throwError(() => new Error('Test error'));
        } else {
          return of(42);
        }
      }
    }

    // Create an instance of the class and call the decorated method
    const instance = new TestClass();
    const result = await instance.testMethod().toPromise();

    // Verify that the decorated method was retried and returned the expected result
    expect(count).toBe(2);
    expect(result).toBe(42);
  });

  it('should stop retrying after the maximum number of retries is reached', async () => {
    // Define a class with a decorated method that always throws an error
    let count = 0;

    class TestClass {
      @RetryOnError()
      testMethod(): Observable<number> {
        count++;
        return throwError(new Error('Test error'));
      }
    }

    // Create an instance of the class and call the decorated method
    const instance = new TestClass();

    // Verify that the decorated method throws an error after the maximum number of retries is reached
    await expect(instance.testMethod().toPromise()).rejects.toThrow(
      'Test error',
    );
    expect(count).toBe(4);
  });

  it('should not retry the decorated method if the error is not filtered', async () => {
    // Define a class with a decorated method that always throws an error
    let count = 0;

    class TestClass {
      @RetryOnError({
        errorFilter: (error) => error instanceof TypeError,
      })
      testMethod(): Observable<number> {
        count++;
        return throwError(new Error('Test error'));
      }
    }

    // Create an instance of the class and call the decorated method
    const instance = new TestClass();

    // Verify that the decorated method throws an error immediately without retrying
    expect(instance.testMethod().toPromise()).rejects.toThrow('Test error');
    expect(count).toBe(1);
  });

  it('should delay between retries', async () => {
    // Define a class with a decorated method that returns an error the first time it is called
    let count = 0;
    const startTime = new Date().getTime();

    const delay = 100;

    class TestClass {
      @RetryOnError({
        retryDelay: delay,
      })
      testMethod(): Observable<number> {
        count++;
        if (count === 1) {
          return throwError(new Error('Test error'));
        } else {
          return of(42);
        }
      }
    }

    // Create an instance of the class and call the decorated method
    const instance = new TestClass();
    await instance.testMethod().toPromise();

    // Verify that the decorated method was retried with a delay between retries
    const endTime = new Date().getTime();
    const duration = endTime - startTime;
    expect(duration).toBeGreaterThanOrEqual(delay);
  });

  it('should call the onRetry function when a retry occurs', async () => {
    // Define a class with a decorated method that returns an error the first time it is called
    let count = 0;
    let message = '';

    class TestClass {
      @RetryOnError({
        onRetry: (error, retryCount) => {
          message = `Retrying (${retryCount}) due to error: ${error.message}`;
        },
      })
      testMethod(): Observable<number> {
        count++;
        if (count === 1) {
          return throwError(new Error('Test error'));
        } else {
          return of(42);
        }
      }
    }

    // Create an instance of the class and call the decorated method
    const instance = new TestClass();
    await instance.testMethod().toPromise();

    // Verify that the onRetry function was called with the expected arguments
    expect(message).toBe('Retrying (1) due to error: Test error');
  });

  it('should preserve this pointer', async () => {
    class TestClass {
      readonly x = 1;

      @RetryOnError()
      testMethod(): Observable<number> {
        return of(this.x);
      }
    }

    const instance = new TestClass();
    const result = await instance.testMethod().toPromise();
    expect(result).toBe(1);
  });
});
