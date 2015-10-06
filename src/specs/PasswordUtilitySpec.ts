///<reference path='../interfaces/IServerConfiguration.ts'/>

import { PasswordUtility } from '../security/PasswordUtility';

describe('Password Utility', () => {
    it('should encrypt new password with unique value', () => {
        //var configuration: IServerConfiguration = <any>{};
        //configuration.systemKey = "abc";
        var user: IUser = <any>{};
        PasswordUtility.savePassword('abc', user);
        expect(user.password && user.password.length).toBeTruthy();
        expect(user.seed && user.seed.length).toBeGreaterThan(100);

        var user1: IUser = <any>{};
        var user2: IUser = <any>{};
        var seed = 'seed';
        var password = 'password';
        PasswordUtility.savePassword(password, user1, seed);
        PasswordUtility.savePassword(password, user2, seed);
        expect(user1.password).toEqual(user2.password);
        expect(user1.password).not.toEqual(password);
        expect(user1.seed).toEqual(seed);
    });

    it('should validate saved password', () => {
        var user: IUser = <any>{};
        var password = 'password2';
        PasswordUtility.savePassword(password, user);
        expect(PasswordUtility.isPasswordValid(password, user)).toBeTruthy();
        expect(PasswordUtility.isPasswordValid(password+'a', user)).toBeFalsy();
    });
});