
export class AppConst {}

export class TimeConst {}

export class LimitConst {
  static readonly DeliveryMailCount = 2;
  static readonly MailContentMaxLength = 10000;
  static readonly MailQuickReplyMaxLength = 40;

  static readonly NICKNAME_LENGTH_MAX_LIMIT = 12;
  static readonly NICKNAME_LENGTH_MIN_LIMIT = 1;
  static readonly OCCUPATION_LENGTH_MAX_LIMIT = 6;
  static readonly OCCUPATION_LENGTH_MIN_LIMIT = 1;

  static readonly MATCH_MAIL_CONTENT_MAX_LIMIT = 5000;
  static readonly MATCH_MAIL_CONTENT_MIN_LIMIT = 400;
}

export class RPCConst {
  static readonly TOKEN_SCHEME = 'sora-rpc-authorization';
}
