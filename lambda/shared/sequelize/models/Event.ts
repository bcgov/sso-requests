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
      planDetails: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      underscored: true,
    },
  );
  return Event;
};
