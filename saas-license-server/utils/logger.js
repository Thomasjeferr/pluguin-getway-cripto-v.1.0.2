/**
 * Sistema de Logging Profissional
 * 
 * Substitui console.log/error/warn com:
 * - Níveis de log (debug, info, warn, error)
 * - Mascaramento de dados sensíveis
 * - Controle por ambiente (desabilita debug em produção)
 * - Formatação consistente
 */

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
};

// Determinar nível de log baseado no ambiente
const getLogLevel = () => {
    const env = process.env.NODE_ENV || 'development';
    const logLevel = process.env.LOG_LEVEL || (env === 'production' ? 'info' : 'debug');
    
    switch (logLevel.toLowerCase()) {
        case 'debug': return LOG_LEVELS.DEBUG;
        case 'info': return LOG_LEVELS.INFO;
        case 'warn': return LOG_LEVELS.WARN;
        case 'error': return LOG_LEVELS.ERROR;
        case 'none': return LOG_LEVELS.NONE;
        default: return LOG_LEVELS.INFO;
    }
};

const currentLogLevel = getLogLevel();

/**
 * Mascarar dados sensíveis em strings
 */
function maskSensitiveData(data) {
    if (typeof data !== 'string') {
        return data;
    }
    
    // Padrões para mascarar
    const patterns = [
        // Senhas
        /(password|senha|passwd|pwd)\s*[:=]\s*['"]?([^'"\s]+)['"]?/gi,
        // Tokens e chaves
        /(token|api[_-]?key|secret|chave|key)\s*[:=]\s*['"]?([^'"\s]+)['"]?/gi,
        // Emails com senhas
        /email['":\s]+([^\s@]+@[^\s@]+).*password['":\s]+([^\s]+)/gi,
        // MongoDB URIs
        /mongodb[+srv]*:\/\/[^:]+:([^@]+)@/gi,
        // Stripe keys
        /(sk_|pk_|whsec_)[a-zA-Z0-9]+/gi,
        // JWT tokens
        /eyJ[A-Za-z0-9-_=]+\.eyJ[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g,
        // Credit card numbers
        /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    ];
    
    let masked = data;
    
    patterns.forEach((pattern, index) => {
        if (index < 2) {
            // Para senhas e tokens, substituir valor
            masked = masked.replace(pattern, (match, key, value) => {
                return `${key}: ***MASKED***`;
            });
        } else if (index === 2) {
            // Para email+password
            masked = masked.replace(pattern, (match, email, password) => {
                return `email: ${email} password: ***MASKED***`;
            });
        } else if (index === 3) {
            // Para MongoDB URI
            masked = masked.replace(pattern, (match, password) => {
                return match.replace(password, '***MASKED***');
            });
        } else {
            // Para outros padrões, mascarar completamente
            masked = masked.replace(pattern, '***MASKED***');
        }
    });
    
    return masked;
}

/**
 * Formatar mensagem de log
 */
function formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const levelUpper = level.toUpperCase().padEnd(5);
    return `[${timestamp}] [${levelUpper}] ${message}`;
}

/**
 * Logger principal
 */
class Logger {
    constructor(context = 'APP') {
        this.context = context;
    }
    
    /**
     * Log de debug (apenas em desenvolvimento)
     */
    debug(message, ...args) {
        if (currentLogLevel <= LOG_LEVELS.DEBUG) {
            const formatted = formatMessage('DEBUG', `[${this.context}] ${message}`, ...args);
            const masked = maskSensitiveData(formatted);
            const maskedArgs = args.map(arg => {
                if (typeof arg === 'string') {
                    return maskSensitiveData(arg);
                } else if (typeof arg === 'object' && arg !== null) {
                    return this.maskObject(arg);
                }
                return arg;
            });
            console.log(masked, ...maskedArgs);
        }
    }
    
    /**
     * Log de informação
     */
    info(message, ...args) {
        if (currentLogLevel <= LOG_LEVELS.INFO) {
            const formatted = formatMessage('INFO', `[${this.context}] ${message}`, ...args);
            const masked = maskSensitiveData(formatted);
            const maskedArgs = args.map(arg => {
                if (typeof arg === 'string') {
                    return maskSensitiveData(arg);
                } else if (typeof arg === 'object' && arg !== null) {
                    return this.maskObject(arg);
                }
                return arg;
            });
            console.log(masked, ...maskedArgs);
        }
    }
    
    /**
     * Log de aviso
     */
    warn(message, ...args) {
        if (currentLogLevel <= LOG_LEVELS.WARN) {
            const formatted = formatMessage('WARN', `[${this.context}] ${message}`, ...args);
            const masked = maskSensitiveData(formatted);
            const maskedArgs = args.map(arg => {
                if (typeof arg === 'string') {
                    return maskSensitiveData(arg);
                } else if (typeof arg === 'object' && arg !== null) {
                    return this.maskObject(arg);
                }
                return arg;
            });
            console.warn(masked, ...maskedArgs);
        }
    }
    
    /**
     * Log de erro
     */
    error(message, error = null, ...args) {
        if (currentLogLevel <= LOG_LEVELS.ERROR) {
            const formatted = formatMessage('ERROR', `[${this.context}] ${message}`, ...args);
            const masked = formatMessage('ERROR', `[${this.context}] ${maskSensitiveData(message)}`, ...args);
            
            const maskedArgs = args.map(arg => {
                if (typeof arg === 'string') {
                    return maskSensitiveData(arg);
                } else if (typeof arg === 'object' && arg !== null) {
                    return this.maskObject(arg);
                }
                return arg;
            });
            
            if (error) {
                // Mascarar stack trace se contiver dados sensíveis
                let errorMessage = error.message || String(error);
                errorMessage = maskSensitiveData(errorMessage);
                console.error(masked, errorMessage, ...maskedArgs);
                
                // Em desenvolvimento, mostrar stack trace completo
                if (currentLogLevel <= LOG_LEVELS.DEBUG && error.stack) {
                    console.error('Stack:', maskSensitiveData(error.stack));
                }
            } else {
                console.error(masked, ...maskedArgs);
            }
        }
    }
    
    /**
     * Mascarar objeto recursivamente
     */
    maskObject(obj, depth = 0) {
        if (depth > 3) return '[Object]'; // Limitar profundidade
        
        if (obj === null || obj === undefined) {
            return obj;
        }
        
        if (typeof obj !== 'object') {
            return typeof obj === 'string' ? maskSensitiveData(obj) : obj;
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.maskObject(item, depth + 1));
        }
        
        const masked = {};
        const sensitiveKeys = ['password', 'senha', 'passwd', 'pwd', 'token', 'apiKey', 'api_key', 'secret', 'chave', 'key', 'authorization', 'auth'];
        
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const lowerKey = key.toLowerCase();
                if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
                    masked[key] = '***MASKED***';
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    masked[key] = this.maskObject(obj[key], depth + 1);
                } else if (typeof obj[key] === 'string') {
                    masked[key] = maskSensitiveData(obj[key]);
                } else {
                    masked[key] = obj[key];
                }
            }
        }
        
        return masked;
    }
    
    /**
     * Criar logger com contexto específico
     */
    child(context) {
        return new Logger(`${this.context}:${context}`);
    }
}

// Exportar instância padrão
const logger = new Logger('APP');

// Exportar classe para criar loggers customizados
module.exports = logger;
module.exports.Logger = Logger;
module.exports.LOG_LEVELS = LOG_LEVELS;



