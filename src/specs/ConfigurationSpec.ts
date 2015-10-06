import { Configuration } from '../config/Configuration';

describe('Configuration', () => {
    it('Should load server configuration', (done) => {
        var configuration = new Configuration();
        configuration.getServerConfiguration((error: Error, serverConfiguration: IServerConfiguration) => {
            expect(error).toBeFalsy();
            expect(serverConfiguration.systemKey).toBe('nothing');
            done();
        });
    });
});
