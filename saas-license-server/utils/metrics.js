/**
 * Sistema básico de métricas e monitoramento
 * 
 * Coleta métricas simples de performance e uso
 * Pode ser expandido para integração com Prometheus/Grafana
 */

class MetricsCollector {
    constructor() {
        this.metrics = {
            requests: {
                total: 0,
                byEndpoint: {},
                byStatus: {},
                responseTimes: []
            },
            licenses: {
                validations: 0,
                failures: 0,
                cacheHits: 0
            },
            errors: {
                total: 0,
                byType: {}
            },
            startTime: Date.now()
        };
    }

    // Registrar requisição
    recordRequest(endpoint, statusCode, responseTime) {
        this.metrics.requests.total++;
        
        if (!this.metrics.requests.byEndpoint[endpoint]) {
            this.metrics.requests.byEndpoint[endpoint] = 0;
        }
        this.metrics.requests.byEndpoint[endpoint]++;
        
        const status = Math.floor(statusCode / 100) * 100; // 200, 300, 400, 500
        if (!this.metrics.requests.byStatus[status]) {
            this.metrics.requests.byStatus[status] = 0;
        }
        this.metrics.requests.byStatus[status]++;
        
        this.metrics.requests.responseTimes.push(responseTime);
        
        // Manter apenas últimas 1000 medições
        if (this.metrics.requests.responseTimes.length > 1000) {
            this.metrics.requests.responseTimes.shift();
        }
    }

    // Registrar validação de licença
    recordLicenseValidation(success, cached = false) {
        if (success) {
            this.metrics.licenses.validations++;
            if (cached) {
                this.metrics.licenses.cacheHits++;
            }
        } else {
            this.metrics.licenses.failures++;
        }
    }

    // Registrar erro
    recordError(errorType) {
        this.metrics.errors.total++;
        if (!this.metrics.errors.byType[errorType]) {
            this.metrics.errors.byType[errorType] = 0;
        }
        this.metrics.errors.byType[errorType]++;
    }

    // Obter estatísticas
    getStats() {
        const responseTimes = this.metrics.requests.responseTimes;
        const avgResponseTime = responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 0;
        
        const uptime = Date.now() - this.metrics.startTime;
        
        return {
            uptime: Math.floor(uptime / 1000), // em segundos
            requests: {
                total: this.metrics.requests.total,
                byEndpoint: this.metrics.requests.byEndpoint,
                byStatus: this.metrics.requests.byStatus,
                avgResponseTime: Math.round(avgResponseTime),
                requestsPerSecond: this.metrics.requests.total / (uptime / 1000)
            },
            licenses: {
                validations: this.metrics.licenses.validations,
                failures: this.metrics.licenses.failures,
                cacheHits: this.metrics.licenses.cacheHits,
                successRate: this.metrics.licenses.validations > 0
                    ? ((this.metrics.licenses.validations - this.metrics.licenses.failures) / this.metrics.licenses.validations * 100).toFixed(2)
                    : 0
            },
            errors: {
                total: this.metrics.errors.total,
                byType: this.metrics.errors.byType
            }
        };
    }

    // Reset métricas
    reset() {
        this.metrics = {
            requests: {
                total: 0,
                byEndpoint: {},
                byStatus: {},
                responseTimes: []
            },
            licenses: {
                validations: 0,
                failures: 0,
                cacheHits: 0
            },
            errors: {
                total: 0,
                byType: {}
            },
            startTime: Date.now()
        };
    }
}

// Instância global
const metricsCollector = new MetricsCollector();

module.exports = metricsCollector;
