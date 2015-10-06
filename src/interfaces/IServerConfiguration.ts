interface IDatabaseConfiguration {
    module: string;
    configuration: any;
}

interface IServerConfiguration {
    access: { [key: string] : string[] };
    accessRightsList: string[];
    database: IDatabaseConfiguration;
    adminPanelPath: string;
    systemKey: string;
}
