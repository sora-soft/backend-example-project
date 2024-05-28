import {URL} from 'url';
import {IAliCloudCommonConfig} from './AliCloudType.js';

export interface IAliCloudCDNConfig {
  domain: string;
}

class AliCloudCDN {
  constructor(config: IAliCloudCommonConfig, cdnConfig: IAliCloudCDNConfig) {
    this.cdnConfig = cdnConfig;
  }

  resolveUrl(key: string) {
    const url = new URL(key, this.cdnConfig.domain);
    return url.toString();
  }

  get domain() {
    return this.cdnConfig.domain;
  }

  private cdnConfig: IAliCloudCDNConfig;

}

export {AliCloudCDN};
