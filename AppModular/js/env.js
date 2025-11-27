// AppModular/js/env.js

const QA_HOSTNAMES = ['localhost', '127.0.0.1', 'app-financiera-qa.web.app'];

/**
 * Determina el entorno actual basado en el hostname.
 * @returns {'qa' | 'production'}
 */
export function getEnvironment() {
    if (QA_HOSTNAMES.includes(window.location.hostname)) {
        return 'qa';
    }
    return 'production';
}
