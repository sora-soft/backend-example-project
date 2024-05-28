import RPCClient from '@alicloud/pop-core';
import {IAliCloudCommonConfig} from './AliCloudType.js';
import {AliCloudError, AliCloudErrorCode} from './AliCloudError.js';

export interface IAliCloudGreenCipConfig {
  endpoint: string;
}

export enum GreenCipTextService {
  Nickname = 'nickname_detection',
  Chat = 'chat_detection',
  Comment = 'comment_detection',
  AIGC = 'ai_art_detection',
  AD = 'ad_compliance_detection',
  PGC = 'pgc_detection',
}

export interface IAliCloudGreenCipTextModerationResponse {
  Code: number;
  RequestId: string;
  Message: string;
  Data: {
    reason: string;
    accountId: string;
    labels: string;
  };
}

export interface IAliCloudGreenCipTextModerationReason {
  riskTips?: string;
  riskWords?: string;
}

export enum GreenCipImageService {
  BaselineCheck = 'baselineCheck',
  BaselineCheckPro = 'baselineCheck_pro',
  BaselineCheckCb = 'baselineCheck_cb',
  TonalityImprove = 'tonalityImprove',
  AigcCheck = 'aigcCheck',
  ProfilePhotoCheck = 'profilePhotoCheck',
  AdvertisingCheck = 'advertisingCheck',
  LiveStreamCheck = 'liveStreamCheck',
}

export interface IAliCloudGreenCipOssInfo {
  ossBucketName: string;
  ossObjectName: string;
  ossRegionId: string;
}

export interface IAliCloudGreenCipImageModerationResponse {
  Code: number;
  RequestId: string;
  Message: string;
  Data: {
    dataId?: string;
    Result: {Label: string; Confidence: number}[];
  };
}

export class AliCloudGreenCip {
  constructor(config: IAliCloudCommonConfig, greenCipConfig: IAliCloudGreenCipConfig) {
    this.client_ = new RPCClient({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      endpoint: greenCipConfig.endpoint,
      apiVersion: '2022-03-02',
    });
  }

  async textModeration(service: GreenCipTextService, content: string, accountId?: string) {
    if (content.trim().length === 0)
      throw new AliCloudError(AliCloudErrorCode.ERR_GREEN_CIP_CONTENT_EMPTY, 'ERR_GREEN_CIP_CONTENT_EMPTY');

    const contentPieces: string[] = [];
    do {
      const pieces = content.slice(0, 600);
      contentPieces.push(pieces);

      if (content.length > 600) {
        content = content.slice(500);
      } else {
        content = '';
      }
    } while (content.length > 0);

    for (const pieces of contentPieces) {
      if (pieces.trim().length === 0)
        continue;

      const params = {
        Service: service,
        ServiceParameters: JSON.stringify({
          content: pieces,
          accountId,
        }),
      };

      const requestOption = {
        method: 'POST',
        formatParams: false,
      };

      const response = await this.client_.request<IAliCloudGreenCipTextModerationResponse>('TextModeration', params, requestOption).catch((err: Error) => {
        if (err['code']) {
          switch (err['code']) {
            case 'SecurityIntercept':
              throw new AliCloudError(AliCloudErrorCode.ERR_GREEN_CIP_SECURITY_INTERCEPT, 'ERR_GREEN_CIP_SECURITY_INTERCEPT');
          }
        }
        throw err;
      });
      if (response.Code !== 200)
        throw new AliCloudError(AliCloudErrorCode.ERR_REQUEST_ERROR, response.Message);

      let reason: IAliCloudGreenCipTextModerationReason = {};
      if (response.Data.reason.length) {
        reason = JSON.parse(response.Data.reason) as IAliCloudGreenCipTextModerationReason;
      }

      if (response.Data.labels.length) {
        return {
          reason,
          labels: response.Data.labels,
        };
      }
    }

    return {
      reason: '',
      labels: '',
    };
  }

  async ossImageModeration(service: GreenCipImageService, ossInfo: IAliCloudGreenCipOssInfo) {
    const params = {
      Service: service,
      ServiceParameters: JSON.stringify({
        ossRegionId: ossInfo.ossRegionId,
        ossBucketName: ossInfo.ossBucketName,
        ossObjectName: ossInfo.ossObjectName,
      }),
    };

    const requestOption = {
      method: 'POST',
      formatParams: false,
    };

    const response = await this.client_.request<IAliCloudGreenCipImageModerationResponse>('ImageModeration', params, requestOption).catch((err: Error) => {
      if (err['code']) {
        switch (err['code']) {
          case 'SecurityIntercept':
            throw new AliCloudError(AliCloudErrorCode.ERR_GREEN_CIP_SECURITY_INTERCEPT, 'ERR_GREEN_CIP_SECURITY_INTERCEPT');
        }
      }
      throw err;
    });
    if (response.Code !== 200)
      throw new AliCloudError(AliCloudErrorCode.ERR_REQUEST_ERROR, response.Message);

    return response.Data.Result.map((r) => {
      return {
        label: r.Label,
        confidence: r.Confidence || 0,
      };
    });
  }

  private client_: RPCClient;
}
