module.exports =(sequelize, DataTypes) => {
  return sequelize.define("GoogleAuth", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    googleId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    firstName: DataTypes.STRING,
    lastName: DataTypes.STRING,
    profilePic: DataTypes.STRING,
    lastLogin: DataTypes.DATE,
  });
};
