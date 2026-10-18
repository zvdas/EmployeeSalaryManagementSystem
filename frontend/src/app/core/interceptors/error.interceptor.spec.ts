import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '../models';
import {
  errorInterceptor,
  inlineErrors,
  FALLBACK_ERROR_MESSAGE,
  OFFLINE_ERROR_MESSAGE,
} from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  const open = jest.fn();

  beforeEach(() => {
    open.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: MatSnackBar, useValue: { open } },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  async function failWith(
    respond: (req: ReturnType<HttpTestingController['expectOne']>) => void,
    responseType: 'json' | 'blob' = 'json',
  ): Promise<unknown> {
    const result =
      responseType === 'blob'
        ? firstValueFrom(http.get('/x', { responseType: 'blob' }))
        : firstValueFrom(http.get('/x'));
    respond(controller.expectOne('/x'));
    return result.then(
      () => undefined,
      (err: unknown) => err,
    );
  }

  const conflict: ApiError = {
    error: { code: 'CONFLICT', message: 'Email already exists' },
  };

  it('shows the contract error message and rethrows', async () => {
    const err = await failWith((req) =>
      req.flush(conflict, { status: 409, statusText: 'Conflict' }),
    );

    expect(open).toHaveBeenCalledWith('Email already exists', 'Dismiss', expect.any(Object));
    expect(err).toMatchObject({ status: 409 });
  });

  it('reads the message from a blob error body', async () => {
    await failWith(
      (req) =>
        req.flush(new Blob([JSON.stringify(conflict)], { type: 'application/json' }), {
          status: 409,
          statusText: 'Conflict',
        }),
      'blob',
    );

    expect(open).toHaveBeenCalledWith('Email already exists', 'Dismiss', expect.any(Object));
  });

  it('falls back to a generic message when the body is not an API error', async () => {
    await failWith((req) => req.flush('oops', { status: 500, statusText: 'Server Error' }));
    expect(open).toHaveBeenCalledWith(FALLBACK_ERROR_MESSAGE, 'Dismiss', expect.any(Object));
  });

  it('reports an unreachable server for status 0', async () => {
    const err = await failWith((req) => req.error(new ProgressEvent('error'), { status: 0 }));

    expect(open).toHaveBeenCalledWith(OFFLINE_ERROR_MESSAGE, 'Dismiss', expect.any(Object));
    expect(err).toMatchObject({ status: 0 });
  });

  it('leaves successful responses alone', async () => {
    const result = firstValueFrom(http.get('/x'));
    controller.expectOne('/x').flush({ ok: true });

    await expect(result).resolves.toEqual({ ok: true });
    expect(open).not.toHaveBeenCalled();
  });

  describe('with inline error statuses', () => {
    function postWithInline(status: number): Promise<unknown> {
      const result = firstValueFrom(http.post('/form', {}, { context: inlineErrors(400, 409) }));
      controller.expectOne('/form').flush(conflict, { status, statusText: 'Error' });
      return result.then(
        () => undefined,
        (err: unknown) => err,
      );
    }

    it('skips the snackbar for statuses the caller shows inline, but still rethrows', async () => {
      const err = await postWithInline(409);

      expect(open).not.toHaveBeenCalled();
      expect(err).toMatchObject({ status: 409 });
    });

    it('still shows the snackbar for other statuses', async () => {
      await postWithInline(500);

      expect(open).toHaveBeenCalledWith('Email already exists', 'Dismiss', expect.any(Object));
    });
  });
});
