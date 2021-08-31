module.exports = (sequelize, DataTypes) => {
  const Event = sequelize.define(
    'event',
    {
      requestId: {
        type: DataTypes.INTEGER,
        references: { model: 'requests', key: 'id' },
        allowNull: true,
      },
      eventCode: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      idirUserid: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      details: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      idirUserDisplayName: {
        type: DataTypes.STRING,
        field: 'idir_user_display_name',
      },
    },
    {
      underscored: true,
    },
  );
  return Event;
};
