///<reference path='../interfaces/IServerConfiguration.ts'/>

interface IConfiguration {
    getServerConfiguration(callback: (error: Error, configuration?: IServerConfiguration) => void): void;
}
