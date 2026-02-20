const logger = (req, res, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.url;
    const ip = req.ip || req.connection.remoteAddress;
    
    // Цвета для разных методов в консоли
    const colors = {
        GET: '\x1b[32m', // Зеленый
        POST: '\x1b[33m', // Желтый
        PUT: '\x1b[34m', // Синий
        PATCH: '\x1b[35m', // Пурпурный
        DELETE: '\x1b[31m', // Красный
        reset: '\x1b[0m'
    };
    
    const color = colors[method] || '\x1b[37m'; // Белый по умолчанию
    
    console.log(
        `[${timestamp}] ${color}${method}${colors.reset} ${url} - ${ip}`
    );
    
    // Логирование тела запроса для методов, которые его используют
    if (['POST', 'PUT', 'PATCH'].includes(method) && Object.keys(req.body).length > 0) {
        console.log('   📦 Body:', JSON.stringify(req.body, null, 2));
    }
    
    // Запоминаем время начала обработки запроса
    const start = Date.now();
    
    // Логируем время ответа
    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusCode = res.statusCode;
        
        // Цвет для статуса
        const statusColor = statusCode >= 500 ? '\x1b[31m' : // Красный для 5xx
                           statusCode >= 400 ? '\x1b[33m' : // Желтый для 4xx
                           statusCode >= 300 ? '\x1b[36m' : // Голубой для 3xx
                           '\x1b[32m'; // Зеленый для 2xx
        
        console.log(
            `   ⏱️  ${duration}ms | Статус: ${statusColor}${statusCode}${colors.reset}`
        );
    });
    
    next();
};

module.exports = logger;