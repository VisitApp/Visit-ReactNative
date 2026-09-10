import { createGeneratedSsoUrl } from '../Services';

describe('createGeneratedSsoUrl', () => {
  const baseUrl = 'https://star-health.getvisitapp.com/?mluib7c';

  test('adds the SDK version to the generated SSO URL', () => {
    const url = createGeneratedSsoUrl({
      baseUrl,
      magicCode: 'magic-code',
    });

    expect(url).toBe(
      'https://star-health.getvisitapp.com/?mluib7c=magic-code&sdkVersion=2'
    );
    expect(url.match(/sdkVersion=2/g)).toHaveLength(1);
  });

  test('appends existing optional parameters after the SDK version', () => {
    expect(
      createGeneratedSsoUrl({
        baseUrl,
        magicCode: 'magic-code',
        moduleName: 'pharmacy',
        responseReferenceId: 'response-reference',
        otherValues: 'other-values',
      })
    ).toBe(
      'https://star-health.getvisitapp.com/?mluib7c=magic-code&sdkVersion=2&tab=pharmacy&responseReferenceId=response-reference&otherValues=other-values'
    );
  });

  test.each([
    [{ moduleName: '' }, 'tab'],
    [{ moduleName: '   ' }, 'tab'],
    [{ responseReferenceId: '' }, 'responseReferenceId'],
    [{ responseReferenceId: 123 }, 'responseReferenceId'],
    [{ otherValues: '' }, 'otherValues'],
    [{ otherValues: 123 }, 'otherValues'],
  ])('omits invalid optional parameter %s', (values, parameterName) => {
    const url = createGeneratedSsoUrl({
      baseUrl,
      magicCode: 'magic-code',
      ...values,
    });

    expect(url).not.toContain(`&${parameterName}=`);
  });
});
