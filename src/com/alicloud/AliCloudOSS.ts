import {IAliCloudCommonConfig} from './AliCloudType.js';
import OSS from 'ali-oss';
import {NodeTime} from '@sora-soft/framework';
import Stream from 'stream';

export interface IAliCloudOSSConfig {
  bucket: string;
  region: string;
}

export interface IReqGenerateUploadSign {
  expiredAt: number; // unix timestamp
  lengthRange?: [number, number];
}

export interface IUploadPolicy {
  conditions: any[];
  expiration?: string;
}

export interface IUploadSign {
  host: string;
  signature: string;
  policy: string;
  accessKey: string;
}

class AliCloudOSS {
  constructor(config: IAliCloudCommonConfig, ossConfig: IAliCloudOSSConfig) {
    this.client_ = new OSS({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      bucket: ossConfig.bucket,
      region: ossConfig.region,
    });

    this.ossConfig_ = ossConfig;
  }

  async generateUploadSign(req: IReqGenerateUploadSign): Promise<IUploadSign> {
    const policy: IUploadPolicy = {
      expiration: new Date(NodeTime.fromUnixTime(req.expiredAt)).toISOString(),
      conditions: [{bucket: this.ossConfig_.bucket}],
    };
    if (req.expiredAt) {
      policy.expiration = new Date(NodeTime.fromUnixTime(req.expiredAt)).toISOString();
    }
    if (req.lengthRange) {
      policy.conditions.push(['content-length-range', req.lengthRange[0], req.lengthRange[1]]);
    }

    const formData = this.client_.calculatePostSignature(policy);
    const location = await this.client_.getBucketLocation(this.ossConfig_.bucket) as {location: string};
    const host = `https://${this.ossConfig_.bucket}.${location.location}.aliyuncs.com`;
    return {
      host,
      accessKey: formData.OSSAccessKeyId,
      policy: formData.policy,
      signature: formData.Signature,
    };
  }

  signatureUrl(key: string, options?: OSS.SignatureUrlOptions): string {
    return this.client_.signatureUrl(key, options).replace('http:', '');
  }

  putStream(key: string, stream: Stream.Readable) {
    return this.client_.putStream(key, stream);
  }

  get info() {
    return {
      bucket: this.ossConfig_.bucket,
      region: this.ossConfig_.region,
    };
  }

  private ossConfig_: IAliCloudOSSConfig;
  private client_: OSS;
}

export {AliCloudOSS};
