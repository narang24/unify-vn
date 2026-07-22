declare module "passport-gitlab2" {
  import passport = require("passport");
  import express = require("express");

  export interface Profile extends passport.Profile {
    id: string;
    displayName: string;
    username?: string;
    profileUrl?: string;
    emails?: Array<{ value: string }>;
    photos?: Array<{ value: string }>;
    _raw: string;
    _json: any;
  }

  export interface StrategyOption {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    baseURL?: string;
    authorizationURL?: string;
    tokenURL?: string;
    profileURL?: string;
    scope?: string | string[];
    scopeSeparator?: string;
  }

  export interface StrategyOptionWithRequest extends StrategyOption {
    passReqToCallback: true;
  }

  export type VerifyFunction = (
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any, info?: any) => void
  ) => void;

  export type VerifyFunctionWithRequest = (
    req: express.Request,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any, info?: any) => void
  ) => void;

  export class Strategy extends passport.Strategy {
    constructor(options: StrategyOption, verify: VerifyFunction);
    constructor(options: StrategyOptionWithRequest, verify: VerifyFunctionWithRequest);

    name: string;
    authenticate(req: express.Request, options?: object): void;
  }
}
