import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { Events, EventsId } from './Events';
import type { RequestRoles, RequestRolesId } from './RequestRoles';
import type { Teams, TeamsId } from './Teams';
import type { Users, UsersId } from './Users';

export interface RequestsAttributes {
  id: number;
  idirUserid?: string;
  projectName: string;
  clientName?: string;
  realm?: string;
  publicAccess?: boolean;
  devValidRedirectUris: string[];
  testValidRedirectUris: string[];
  prodValidRedirectUris: string[];
  environments: string[];
  prNumber?: number;
  actionNumber?: number;
  createdAt: Date;
  updatedAt: Date;
  projectLead?: boolean;
  preferredEmail?: string;
  newToSso?: boolean;
  agreeWithTerms?: boolean;
  bceidApproved?: boolean;
  status: 'draft' | 'submitted' | 'pr' | 'prFailed' | 'planned' | 'planFailed' | 'approved' | 'applied' | 'applyFailed';
  archived: boolean;
  idirUserDisplayName?: string;
  additionalEmails?: string[];
  hasUnreadNotifications?: boolean;
  browserFlowOverride?: string;
  teamId?: number;
  usesTeam: boolean;
  requester?: string;
  userId?: number;
  serviceType: string;
  devIdps: string[];
  testIdps: string[];
  prodIdps: string[];
  devRoles: string[];
  testRoles: string[];
  prodRoles: string[];
  devAccessTokenLifespan: number;
  devOfflineSessionIdleTimeout: number;
  devOfflineSessionMaxLifespan: number;
  devSessionIdleTimeout: number;
  devSessionMaxLifespan: number;
  testAccessTokenLifespan: number;
  testOfflineSessionIdleTimeout: number;
  testOfflineSessionMaxLifespan: number;
  testSessionIdleTimeout: number;
  testSessionMaxLifespan: number;
  prodAccessTokenLifespan: number;
  prodOfflineSessionIdleTimeout: number;
  prodOfflineSessionMaxLifespan: number;
  prodSessionIdleTimeout: number;
  prodSessionMaxLifespan: number;
  clientId?: string;
  provisioned: boolean;
  provisionedAt?: Date;
  devLoginTitle?: string;
  testLoginTitle?: string;
  prodLoginTitle?: string;
  serviceAccountEnabled: boolean;
  apiServiceAccount: boolean;
  authType: string;
  lastChanges?: object;
  protocol: string;
  devAssertionLifespan: number;
  testAssertionLifespan: number;
  prodAssertionLifespan: number;
  githubApproved: boolean;
  additionalRoleAttribute: string;
  devDisplayHeaderTitle: boolean;
  testDisplayHeaderTitle: boolean;
  prodDisplayHeaderTitle: boolean;
  devSamlLogoutPostBindingUri?: string;
  testSamlLogoutPostBindingUri?: string;
  prodSamlLogoutPostBindingUri?: string;
  devSamlSignAssertions: boolean;
  testSamlSignAssertions: boolean;
  prodSamlSignAssertions: boolean;
  primaryEndUsers?: string[];
  primaryEndUsersOther?: string;
  devOfflineAccessEnabled: boolean;
  testOfflineAccessEnabled: boolean;
  prodOfflineAccessEnabled: boolean;
  bcscPrivacyZone?: string;
  devHomePageUri?: string;
  testHomePageUri?: string;
  prodHomePageUri?: string;
  bcscAttributes: string[];
  bcServicesCardApproved?: boolean;
  confirmSocial?: boolean;
  socialApproved?: boolean;
}

export type RequestsPk = 'id';
export type RequestsId = Requests[RequestsPk];
export type RequestsOptionalAttributes =
  | 'id'
  | 'idirUserid'
  | 'clientName'
  | 'realm'
  | 'publicAccess'
  | 'devValidRedirectUris'
  | 'testValidRedirectUris'
  | 'prodValidRedirectUris'
  | 'environments'
  | 'prNumber'
  | 'actionNumber'
  | 'createdAt'
  | 'updatedAt'
  | 'projectLead'
  | 'preferredEmail'
  | 'newToSso'
  | 'agreeWithTerms'
  | 'bceidApproved'
  | 'status'
  | 'idirUserDisplayName'
  | 'additionalEmails'
  | 'hasUnreadNotifications'
  | 'browserFlowOverride'
  | 'teamId'
  | 'requester'
  | 'userId'
  | 'serviceType'
  | 'devIdps'
  | 'testIdps'
  | 'prodIdps'
  | 'devRoles'
  | 'testRoles'
  | 'prodRoles'
  | 'devAccessTokenLifespan'
  | 'devOfflineSessionIdleTimeout'
  | 'devOfflineSessionMaxLifespan'
  | 'devSessionIdleTimeout'
  | 'devSessionMaxLifespan'
  | 'testAccessTokenLifespan'
  | 'testOfflineSessionIdleTimeout'
  | 'testOfflineSessionMaxLifespan'
  | 'testSessionIdleTimeout'
  | 'testSessionMaxLifespan'
  | 'prodAccessTokenLifespan'
  | 'prodOfflineSessionIdleTimeout'
  | 'prodOfflineSessionMaxLifespan'
  | 'prodSessionIdleTimeout'
  | 'prodSessionMaxLifespan'
  | 'clientId'
  | 'provisionedAt'
  | 'devLoginTitle'
  | 'testLoginTitle'
  | 'prodLoginTitle'
  | 'authType'
  | 'lastChanges'
  | 'protocol'
  | 'devAssertionLifespan'
  | 'testAssertionLifespan'
  | 'prodAssertionLifespan'
  | 'additionalRoleAttribute'
  | 'devDisplayHeaderTitle'
  | 'testDisplayHeaderTitle'
  | 'prodDisplayHeaderTitle'
  | 'devSamlLogoutPostBindingUri'
  | 'testSamlLogoutPostBindingUri'
  | 'prodSamlLogoutPostBindingUri'
  | 'primaryEndUsers'
  | 'primaryEndUsersOther'
  | 'bcscPrivacyZone'
  | 'devHomePageUri'
  | 'testHomePageUri'
  | 'prodHomePageUri'
  | 'bcscAttributes'
  | 'bcServicesCardApproved'
  | 'confirmSocial'
  | 'socialApproved';
export type RequestsCreationAttributes = Optional<RequestsAttributes, RequestsOptionalAttributes>;

export class Requests extends Model<RequestsAttributes, RequestsCreationAttributes> implements RequestsAttributes {
  id!: number;
  idirUserid?: string;
  projectName!: string;
  clientName?: string;
  realm?: string;
  publicAccess?: boolean;
  devValidRedirectUris!: string[];
  testValidRedirectUris!: string[];
  prodValidRedirectUris!: string[];
  environments!: string[];
  prNumber?: number;
  actionNumber?: number;
  createdAt!: Date;
  updatedAt!: Date;
  projectLead?: boolean;
  preferredEmail?: string;
  newToSso?: boolean;
  agreeWithTerms?: boolean;
  bceidApproved?: boolean;
  status!:
    | 'draft'
    | 'submitted'
    | 'pr'
    | 'prFailed'
    | 'planned'
    | 'planFailed'
    | 'approved'
    | 'applied'
    | 'applyFailed';
  archived!: boolean;
  idirUserDisplayName?: string;
  additionalEmails?: string[];
  hasUnreadNotifications?: boolean;
  browserFlowOverride?: string;
  teamId?: number;
  usesTeam!: boolean;
  requester?: string;
  userId?: number;
  serviceType!: string;
  devIdps!: string[];
  testIdps!: string[];
  prodIdps!: string[];
  devRoles!: string[];
  testRoles!: string[];
  prodRoles!: string[];
  devAccessTokenLifespan!: number;
  devOfflineSessionIdleTimeout!: number;
  devOfflineSessionMaxLifespan!: number;
  devSessionIdleTimeout!: number;
  devSessionMaxLifespan!: number;
  testAccessTokenLifespan!: number;
  testOfflineSessionIdleTimeout!: number;
  testOfflineSessionMaxLifespan!: number;
  testSessionIdleTimeout!: number;
  testSessionMaxLifespan!: number;
  prodAccessTokenLifespan!: number;
  prodOfflineSessionIdleTimeout!: number;
  prodOfflineSessionMaxLifespan!: number;
  prodSessionIdleTimeout!: number;
  prodSessionMaxLifespan!: number;
  clientId?: string;
  provisioned!: boolean;
  provisionedAt?: Date;
  devLoginTitle?: string;
  testLoginTitle?: string;
  prodLoginTitle?: string;
  serviceAccountEnabled!: boolean;
  apiServiceAccount!: boolean;
  authType!: string;
  lastChanges?: object;
  protocol!: string;
  devAssertionLifespan!: number;
  testAssertionLifespan!: number;
  prodAssertionLifespan!: number;
  githubApproved!: boolean;
  additionalRoleAttribute!: string;
  devDisplayHeaderTitle!: boolean;
  testDisplayHeaderTitle!: boolean;
  prodDisplayHeaderTitle!: boolean;
  devSamlLogoutPostBindingUri?: string;
  testSamlLogoutPostBindingUri?: string;
  prodSamlLogoutPostBindingUri?: string;
  devSamlSignAssertions!: boolean;
  testSamlSignAssertions!: boolean;
  prodSamlSignAssertions!: boolean;
  primaryEndUsers?: string[];
  primaryEndUsersOther?: string;
  devOfflineAccessEnabled!: boolean;
  testOfflineAccessEnabled!: boolean;
  prodOfflineAccessEnabled!: boolean;
  bcscPrivacyZone?: string;
  devHomePageUri?: string;
  testHomePageUri?: string;
  prodHomePageUri?: string;
  bcscAttributes!: string[];
  bcServicesCardApproved?: boolean;
  confirmSocial?: boolean;
  socialApproved?: boolean;

  // Requests hasMany Events via requestId
  events!: Events[];
  getEvents!: Sequelize.HasManyGetAssociationsMixin<Events>;
  setEvents!: Sequelize.HasManySetAssociationsMixin<Events, EventsId>;
  addEvent!: Sequelize.HasManyAddAssociationMixin<Events, EventsId>;
  addEvents!: Sequelize.HasManyAddAssociationsMixin<Events, EventsId>;
  createEvent!: Sequelize.HasManyCreateAssociationMixin<Events>;
  removeEvent!: Sequelize.HasManyRemoveAssociationMixin<Events, EventsId>;
  removeEvents!: Sequelize.HasManyRemoveAssociationsMixin<Events, EventsId>;
  hasEvent!: Sequelize.HasManyHasAssociationMixin<Events, EventsId>;
  hasEvents!: Sequelize.HasManyHasAssociationsMixin<Events, EventsId>;
  countEvents!: Sequelize.HasManyCountAssociationsMixin;
  // Requests hasMany RequestRoles via requestId
  requestRoles!: RequestRoles[];
  getRequestRoles!: Sequelize.HasManyGetAssociationsMixin<RequestRoles>;
  setRequestRoles!: Sequelize.HasManySetAssociationsMixin<RequestRoles, RequestRolesId>;
  addRequestRole!: Sequelize.HasManyAddAssociationMixin<RequestRoles, RequestRolesId>;
  addRequestRoles!: Sequelize.HasManyAddAssociationsMixin<RequestRoles, RequestRolesId>;
  createRequestRole!: Sequelize.HasManyCreateAssociationMixin<RequestRoles>;
  removeRequestRole!: Sequelize.HasManyRemoveAssociationMixin<RequestRoles, RequestRolesId>;
  removeRequestRoles!: Sequelize.HasManyRemoveAssociationsMixin<RequestRoles, RequestRolesId>;
  hasRequestRole!: Sequelize.HasManyHasAssociationMixin<RequestRoles, RequestRolesId>;
  hasRequestRoles!: Sequelize.HasManyHasAssociationsMixin<RequestRoles, RequestRolesId>;
  countRequestRoles!: Sequelize.HasManyCountAssociationsMixin;
  // Requests belongsTo Teams via teamId
  team!: Teams;
  getTeam!: Sequelize.BelongsToGetAssociationMixin<Teams>;
  setTeam!: Sequelize.BelongsToSetAssociationMixin<Teams, TeamsId>;
  createTeam!: Sequelize.BelongsToCreateAssociationMixin<Teams>;
  // Requests belongsTo Users via userId
  user!: Users;
  getUser!: Sequelize.BelongsToGetAssociationMixin<Users>;
  setUser!: Sequelize.BelongsToSetAssociationMixin<Users, UsersId>;
  createUser!: Sequelize.BelongsToCreateAssociationMixin<Users>;

  static initModel(sequelize: Sequelize.Sequelize): typeof Requests {
    return sequelize.define(
      'Requests',
      {
        id: {
          autoIncrement: true,
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
        },
        idirUserid: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: 'idir_userid',
        },
        projectName: {
          type: DataTypes.STRING(255),
          allowNull: false,
          field: 'project_name',
        },
        clientName: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: 'client_name',
        },
        realm: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        publicAccess: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          field: 'public_access',
        },
        devValidRedirectUris: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: false,
          defaultValue: ['(ARRAY[]'],
          field: 'dev_valid_redirect_uris',
        },
        testValidRedirectUris: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: false,
          defaultValue: ['(ARRAY[]'],
          field: 'test_valid_redirect_uris',
        },
        prodValidRedirectUris: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: false,
          defaultValue: ['(ARRAY[]'],
          field: 'prod_valid_redirect_uris',
        },
        environments: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: false,
          defaultValue: ['(ARRAY[]'],
        },
        prNumber: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'pr_number',
        },
        actionNumber: {
          type: DataTypes.BIGINT,
          allowNull: true,
          field: 'action_number',
        },
        projectLead: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: false,
          field: 'project_lead',
        },
        preferredEmail: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: 'preferred_email',
        },
        newToSso: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: false,
          field: 'new_to_sso',
        },
        agreeWithTerms: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: false,
          field: 'agree_with_terms',
        },
        bceidApproved: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: false,
          field: 'bceid_approved',
        },
        status: {
          type: DataTypes.ENUM(
            'draft',
            'submitted',
            'pr',
            'prFailed',
            'planned',
            'planFailed',
            'approved',
            'applied',
            'applyFailed',
          ),
          allowNull: false,
          defaultValue: 'draft',
        },
        archived: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        idirUserDisplayName: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: 'idir_user_display_name',
        },
        additionalEmails: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: true,
          field: 'additional_emails',
        },
        hasUnreadNotifications: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          field: 'has_unread_notifications',
        },
        browserFlowOverride: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: 'browser_flow_override',
        },
        teamId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'teams',
            key: 'id',
          },
          field: 'team_id',
        },
        usesTeam: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'uses_team',
        },
        requester: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
          field: 'user_id',
        },
        serviceType: {
          type: DataTypes.STRING(255),
          allowNull: false,
          defaultValue: 'silver',
          field: 'service_type',
        },
        devIdps: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: false,
          defaultValue: ['(ARRAY[]'],
          field: 'dev_idps',
        },
        testIdps: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: false,
          defaultValue: ['(ARRAY[]'],
          field: 'test_idps',
        },
        prodIdps: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: false,
          defaultValue: ['(ARRAY[]'],
          field: 'prod_idps',
        },
        devRoles: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: false,
          defaultValue: ['(ARRAY[]'],
          field: 'dev_roles',
        },
        testRoles: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: false,
          defaultValue: ['(ARRAY[]'],
          field: 'test_roles',
        },
        prodRoles: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: false,
          defaultValue: ['(ARRAY[]'],
          field: 'prod_roles',
        },
        devAccessTokenLifespan: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'dev_access_token_lifespan',
        },
        devOfflineSessionIdleTimeout: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'dev_offline_session_idle_timeout',
        },
        devOfflineSessionMaxLifespan: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'dev_offline_session_max_lifespan',
        },
        devSessionIdleTimeout: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'dev_session_idle_timeout',
        },
        devSessionMaxLifespan: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'dev_session_max_lifespan',
        },
        testAccessTokenLifespan: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'test_access_token_lifespan',
        },
        testOfflineSessionIdleTimeout: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'test_offline_session_idle_timeout',
        },
        testOfflineSessionMaxLifespan: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'test_offline_session_max_lifespan',
        },
        testSessionIdleTimeout: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'test_session_idle_timeout',
        },
        testSessionMaxLifespan: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'test_session_max_lifespan',
        },
        prodAccessTokenLifespan: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'prod_access_token_lifespan',
        },
        prodOfflineSessionIdleTimeout: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'prod_offline_session_idle_timeout',
        },
        prodOfflineSessionMaxLifespan: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'prod_offline_session_max_lifespan',
        },
        prodSessionIdleTimeout: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'prod_session_idle_timeout',
        },
        prodSessionMaxLifespan: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'prod_session_max_lifespan',
        },
        clientId: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: 'client_id',
        },
        provisioned: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        provisionedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: 'provisioned_at',
        },
        devLoginTitle: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: 'dev_login_title',
        },
        testLoginTitle: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: 'test_login_title',
        },
        prodLoginTitle: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: 'prod_login_title',
        },
        serviceAccountEnabled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'service_account_enabled',
        },
        apiServiceAccount: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'api_service_account',
        },
        authType: {
          type: DataTypes.STRING(255),
          allowNull: false,
          defaultValue: 'browser-login',
          field: 'auth_type',
        },
        lastChanges: {
          type: DataTypes.JSONB,
          allowNull: true,
          field: 'last_changes',
        },
        protocol: {
          type: DataTypes.STRING(255),
          allowNull: false,
          defaultValue: 'oidc',
        },
        devAssertionLifespan: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'dev_assertion_lifespan',
        },
        testAssertionLifespan: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'test_assertion_lifespan',
        },
        prodAssertionLifespan: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'prod_assertion_lifespan',
        },
        githubApproved: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'github_approved',
        },
        additionalRoleAttribute: {
          type: DataTypes.STRING(255),
          allowNull: false,
          defaultValue: '',
          field: 'additional_role_attribute',
        },
        devDisplayHeaderTitle: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          field: 'dev_display_header_title',
        },
        testDisplayHeaderTitle: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          field: 'test_display_header_title',
        },
        prodDisplayHeaderTitle: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          field: 'prod_display_header_title',
        },
        devSamlLogoutPostBindingUri: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: 'dev_saml_logout_post_binding_uri',
        },
        testSamlLogoutPostBindingUri: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: 'test_saml_logout_post_binding_uri',
        },
        prodSamlLogoutPostBindingUri: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: 'prod_saml_logout_post_binding_uri',
        },
        devSamlSignAssertions: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'dev_saml_sign_assertions',
        },
        testSamlSignAssertions: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'test_saml_sign_assertions',
        },
        prodSamlSignAssertions: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'prod_saml_sign_assertions',
        },
        primaryEndUsers: {
          type: DataTypes.ARRAY(DataTypes.TEXT),
          allowNull: true,
          field: 'primary_end_users',
        },
        primaryEndUsersOther: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: 'primary_end_users_other',
        },
        devOfflineAccessEnabled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'dev_offline_access_enabled',
        },
        testOfflineAccessEnabled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'test_offline_access_enabled',
        },
        prodOfflineAccessEnabled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'prod_offline_access_enabled',
        },
        bcscPrivacyZone: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: 'bcsc_privacy_zone',
        },
        devHomePageUri: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: 'dev_home_page_uri',
        },
        testHomePageUri: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: 'test_home_page_uri',
        },
        prodHomePageUri: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: 'prod_home_page_uri',
        },
        bcscAttributes: {
          type: DataTypes.ARRAY(DataTypes.TEXT),
          allowNull: false,
          defaultValue: ['ARRAY[]'],
          field: 'bcsc_attributes',
        },
        bcServicesCardApproved: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          field: 'bc_services_card_approved',
        },
        confirmSocial: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          field: 'confirm_social',
        },
        socialApproved: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          field: 'social_approved',
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'created_at',
          defaultValue: Sequelize.fn('now'),
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'updated_at',
          defaultValue: Sequelize.fn('now'),
        },
      },
      {
        tableName: 'requests',
        schema: 'public',
        timestamps: true,
        indexes: [
          {
            name: 'requests_pkey',
            unique: true,
            fields: [{ name: 'id' }],
          },
        ],
      },
    ) as typeof Requests;
  }
}
