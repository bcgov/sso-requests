module.exports = (sequelize, DataTypes) => {
  const Event = sequelize.define(
    'event',
    {
      requestId: {
        type: DataTypes.INTEGER,
      },
      eventCode: {
        type: DataTypes.STRING,
      },
      idirUserid: {
        type: DataTypes.STRING,
      },
    },
    {
      underscored: true,
    }
  );
  return Event;
};
