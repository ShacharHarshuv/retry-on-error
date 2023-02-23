import {
  Observable,
  throwError,
} from 'rxjs';
import {
  catchError,
  delay,
} from 'rxjs/operators';
import { createMethodDecoratorFromHighOrderFn } from 'method-decorators-utils';

export function RetryOnError<
  Fn extends (...args: any[]) => Observable<any>
>(options?: {
  maxRetries?: number;
  retryDelay?: number;
  errorFilter?: (error: any) => boolean;
  onRetry?: (error: any, retryCount: number) => void;
}) {
  const _options: Required<NonNullable<typeof options>> = {
    maxRetries: 3,
    retryDelay: 1000,
    errorFilter: () => true,
    onRetry: () => {    },
    ...(options || {}),
  };

  return createMethodDecoratorFromHighOrderFn((childFunction) => {
    return function(this: any, ...args: Parameters<Fn>): ReturnType<Fn> {
      const getObservable = (retryCount: number = 0): ReturnType<Fn> => {
        return childFunction.apply(this, args).pipe(
          catchError((error: any) => {
            if (!_options.errorFilter(error) || retryCount >= _options.maxRetries) {
              return throwError(error);
            }
            _options.onRetry(error, retryCount + 1);

            return getObservable(retryCount + 1).pipe(delay(_options.retryDelay));
          }),
        );
      }

      return getObservable();
    };
  });
}
