///<reference path='../interfaces/IUser.ts'/>

import crypto = require('crypto');
import { Constants } from '../interfaces/Constants';

export class PasswordUtility {

    private static calculatePassword(password: string, seed: string): string {
        var hash = crypto.createHash('sha256');
        hash.update(password + seed);
        return hash.digest().toString('base64');
    }

    static isPasswordValid(password: string, user: IUser): boolean {
        return PasswordUtility.calculatePassword(password, user.seed) == user.password;
    }

    static savePassword(password: string, user: IUser, seed?: string): void {
        if (!seed) {
            seed = crypto.randomBytes(Constants.RANDOM_SEED_LENGTH).toString('base64');
        }
        user.password = PasswordUtility.calculatePassword(password, seed);
        user.seed = seed;
    }
}
