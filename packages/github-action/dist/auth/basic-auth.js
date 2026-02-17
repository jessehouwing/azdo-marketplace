/**
 * Get basic authentication from GitHub Actions inputs
 */
export async function getBasicAuth(username, token, serviceUrl, platform) {
    if (!username) {
        throw new Error('Username is required for basic authentication');
    }
    if (token === undefined || token === null) {
        throw new Error('Token is required for basic authentication');
    }
    // Mask the token immediately to prevent exposure in logs
    // Note: username is typically not sensitive, but token definitely is
    // We mask even empty tokens for consistency
    platform.setSecret(token);
    // Use provided service URL or default to marketplace
    const finalServiceUrl = serviceUrl || 'https://marketplace.visualstudio.com';
    return {
        authType: 'basic',
        serviceUrl: finalServiceUrl,
        username,
        password: token,
    };
}
//# sourceMappingURL=basic-auth.js.map