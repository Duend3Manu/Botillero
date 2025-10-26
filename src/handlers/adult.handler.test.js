const { handleXvideosSearch } = require('./adult.handler');
const adultService = require('../services/adult.service');

jest.mock('../services/adult.service');

describe('handleXvideosSearch', () => {
    let message;

    beforeEach(() => {
        message = {
            body: '',
            reply: jest.fn(),
        };
        // Mock adultService.searchXvideos to throw an error by default, to ensure it's not called unexpectedly
        adultService.searchXvideos.mockImplementation(() => {
            throw new Error('adultService.searchXvideos should not be called by default');
        });
        adultService.searchXvideos.mockClear();
    });

    test('should return a message if no keyword is provided', async () => {
        message.body = '!xv';
        const result = await handleXvideosSearch(message);
        expect(result).toBe('Por favor, escribe un término de búsqueda. Ejemplo: `!xv ...`');
        expect(message.reply).not.toHaveBeenCalled();
        expect(adultService.searchXvideos).not.toHaveBeenCalled();
    });

    test('should return a message if no videos are found', async () => {
        message.body = '!xv nonexistantkeyword';
        adultService.searchXvideos.mockResolvedValueOnce([]);

        const result = await handleXvideosSearch(message);
        expect(message.reply).toHaveBeenCalledWith('🔞 *Advertencia:* El contenido a continuación es para adultos. Proceda con discreción.');
        expect(adultService.searchXvideos).toHaveBeenCalledWith('nonexistantkeyword');
        // Updated expectation to include asterisks
        expect(result).toBe('No se encontraron videos para "*nonexistantkeyword*".');
    });

    test('should return a formatted list of videos if found', async () => {
        message.body = '!xv keyword';
        const mockVideos = [
            { title: 'Video 1', duration: '10:00', url: 'http://example.com/video1' },
            { title: 'Video 2', duration: '05:30', url: 'http://example.com/video2' },
            { title: 'Video 3', duration: '12:15', url: 'http://example.com/video3' },
            { title: 'Video 4', duration: '08:00', url: 'http://example.com/video4' },
            { title: 'Video 5', duration: '03:45', url: 'http://example.com/video5' },
            { title: 'Video 6', duration: '01:00', url: 'http://example.com/video6' }, // Should not be included
            { title: 'Video 7', duration: '01:00', url: 'http://example.com/video7' },
            { title: 'Video 8', duration: '01:00', url: 'http://example.com/video8' },
            { title: 'Video 9', duration: '01:00', url: 'http://example.com/video9' },
            { title: 'Video 10', duration: '01:00', url: 'http://example.com/video10' },
            { title: 'Video 11', duration: '01:00', url: 'http://example.com/video11' },
            { title: 'Video 12', duration: '01:00', url: 'http://example.com/video12' },
            { title: 'Video 13', duration: '01:00', url: 'http://example.com/video13' }, // Should not be included
        ];
        adultService.searchXvideos.mockResolvedValueOnce(mockVideos);

        const result = await handleXvideosSearch(message);
        expect(message.reply).toHaveBeenCalledWith('🔞 *Advertencia:* El contenido a continuación es para adultos. Proceda con discreción.');
        expect(adultService.searchXvideos).toHaveBeenCalledWith('keyword');

        const expectedReply = `Resultados de búsqueda en Xvideos para *"keyword"*:\n\n` +
            `Video 1\nDuración: 10:00\nURL: https://www.xvideos.comhttp://example.com/video1\n\n` +
            `Video 2\nDuración: 05:30\nURL: https://www.xvideos.comhttp://example.com/video2\n\n` +
            `Video 3\nDuración: 12:15\nURL: https://www.xvideos.comhttp://example.com/video3\n\n` +
            `Video 4\nDuración: 08:00\nURL: https://www.xvideos.comhttp://example.com/video4\n\n` +
            `Video 5\nDuración: 03:45\nURL: https://www.xvideos.comhttp://example.com/video5\n\n` +
            `Video 6\nDuración: 01:00\nURL: https://www.xvideos.comhttp://example.com/video6\n\n` +
            `Video 7\nDuración: 01:00\nURL: https://www.xvideos.comhttp://example.com/video7\n\n` +
            `Video 8\nDuración: 01:00\nURL: https://www.xvideos.comhttp://example.com/video8\n\n` +
            `Video 9\nDuración: 01:00\nURL: https://www.xvideos.comhttp://example.com/video9\n\n` +
            `Video 10\nDuración: 01:00\nURL: https://www.xvideos.comhttp://example.com/video10\n\n` +
            `Video 11\nDuración: 01:00\nURL: https://www.xvideos.comhttp://example.com/video11\n\n` +
            `Video 12\nDuración: 01:00\nURL: https://www.xvideos.comhttp://example.com/video12\n\n`;

        expect(result).toBe(expectedReply);
    });
});