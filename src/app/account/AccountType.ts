import {AuthGroup, AuthPermission} from '../database/Auth.js';

export type AccountId = number;

export type AuthGroupId = string;

export enum PermissionResult {
  ALLOW = 1,
  DENY = 2,
}

export enum AccountLoginType {
  Username = 1,
  Email = 2,
}

// 默认游客 gid
export const GuestGroupId: AuthGroupId = 'd36a956b-7494-480c-8bd9-66b77c89a38c';

// 注册用户
export const UserGroupId: AuthGroupId = 'ebba2b40-25b3-4178-8c8a-6a6eca2def99';

// 超权用户
export const RootGroupId: AuthGroupId = 'cbe3f8c8-44bc-44ef-9a61-3bc4f6692a12';

// 默认用户组别
export const DefaultGroupList: Pick<AuthGroup, 'id' | 'name' | 'protected'>[] = [
  {
    id: UserGroupId,
    name: 'User',
    protected: true,
  },
  {
    id: RootGroupId,
    name: 'Root',
    protected: true,
  },
  {
    id: GuestGroupId,
    name: 'Guest',
    protected: true,
  },
];

// 默认游客权限
export const DefaultPermissionList: Pick<AuthPermission, 'gid' | 'name' | 'permission'>[] = [
  {
    gid: RootGroupId,
    name: 'root',
    permission: PermissionResult.ALLOW,
  },
];
