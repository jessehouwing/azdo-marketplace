import { describe, expect, it } from '@jest/globals';
import { classifyServiceError } from '../service-error.js';

describe('classifyServiceError', () => {
  it.each([
    {
      name: 'expired PAT AccessCheckException payload',
      input:
        'error: Error: \uFEFF{"$id":"1","customProperties":{"Descriptor":null,"IdentityDisplayName":null,"Token":null,"RequestedPermissions":0,"NamespaceId":"00000000-0000-0000-0000-000000000000"},"innerException":null,"message":"Access Denied: The Personal Access Token used has expired.","typeName":"Microsoft.VisualStudio.Services.Security.AccessCheckException, Microsoft.VisualStudio.Services.WebApi","typeKey":"AccessCheckException","errorCode":0,"eventId":3000}',
      expected: 'Access Denied: The Personal Access Token used has expired.',
    },
    {
      name: 'service payload with explicit event ID',
      input: 'error: Error: {"message":"Marketplace service failure.","eventId":3000}',
      expected: 'Marketplace service failure.',
    },
    {
      name: 'tfx-wrapped TF400813 authorization error',
      input:
        "error: Error: TF400813: The user 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' is not authorized to access this resource.",
      expected:
        "TF400813: The user 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' is not authorized to access this resource.",
    },
    {
      name: 'tfx-wrapped TF400856 collection URL error',
      input: 'error: Error: TF400856: Include collection in URL.',
      expected: 'TF400856: Include collection in URL.',
    },
    {
      name: 'explicit HTTP 401 response',
      input:
        "Received response 401 (Not Authorized). Check that your personal access token is correct and hasn't expired.",
      expected:
        "Received response 401 (Not Authorized). Check that your personal access token is correct and hasn't expired.",
    },
    {
      name: 'explicit HTTP 403 response',
      input: 'Received response 403 (Forbidden). Check that you have access.',
      expected: 'Received response 403 (Forbidden). Check that you have access.',
    },
    {
      name: 'standalone 401 status with message',
      input: {
        statusCode: 401,
        message: 'Unauthorized marketplace response.',
      },
      expected: '401 Unauthorized marketplace response.',
    },
    {
      name: 'standalone 403 status with message',
      input: {
        status: 403,
        message: 'Forbidden marketplace response.',
      },
      expected: '403 Forbidden marketplace response.',
    },
    {
      name: 'tfx API location error',
      input:
        'error: Error: Failed to find api location for area: gallery id: e11ea35a-16fe-4b80-ab11-c4cab88a0966',
      expected:
        'error: Error: Failed to find api location for area: gallery id: e11ea35a-16fe-4b80-ab11-c4cab88a0966',
    },
    {
      name: 'tfx unpublished extension error',
      input: 'error: Error: Extension not published.',
      expected: 'error: Error: Extension not published.',
    },
    {
      name: 'tfx missing extension version error',
      input: 'error: Error: Could not find extension version 999999.999999.999999',
      expected: 'error: Error: Could not find extension version 999999.999999.999999',
    },
  ])('returns terminal service error for $name', ({ input, expected }) => {
    const error = classifyServiceError(input);

    expect(error?.message).toBe(expected);
  });

  it.each([
    {
      name: 'plain auth wording',
      input: 'Access Denied: The Personal Access Token used has expired.',
    },
    {
      name: 'tfx request timeout',
      input: 'error: Request timeout: /_apis/gallery/publishers/pub/extensions/ext?flags=15',
    },
    {
      name: 'unrelated HTML response',
      input: '<title>Some other service error</title><h2>Temporarily unavailable</h2>',
    },
    {
      name: 'Azure DevOps Services Unavailable HTML page',
      input:
        'error: <title>Azure DevOps Services Unavailable</title>\r\n' +
        "error: <h2>Sorry! Our services aren't available right now.</h2>",
    },
  ])('does not treat $name as terminal without explicit service signal', ({ input }) => {
    const error = classifyServiceError(input);

    expect(error).toBeUndefined();
  });
});
