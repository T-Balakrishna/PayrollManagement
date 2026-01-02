const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const SalaryGenerationDetail = sequelize.define('SalaryGenerationDetail', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        salaryGenerationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'salary_generations',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        componentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'salary_components',
                key: 'id',
            },
            onDelete: 'RESTRICT',
        },
        componentName: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Component name snapshot'
        },
        componentType: {
            type: DataTypes.ENUM('Earning', 'Deduction'),
            allowNull: false,
        },
        calculationType: {
            type: DataTypes.ENUM('Fixed', 'Percentage', 'Formula'),
            allowNull: false,
        },
        baseAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Base amount before calculation'
        },
        calculatedAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
            comment: 'Final calculated amount'
        },
        isProrated: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Whether amount was prorated based on attendance'
        },
        proratedAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Amount after proration'
        },
        formula: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Formula used for calculation'
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    }, {
        tableName: 'salary_generation_details',
        timestamps: true,
        indexes: [
            {
                fields: ['salaryGenerationId'],
                name: 'salary_generation_detail_index'
            },
            {
                fields: ['componentId'],
                name: 'component_detail_index'
            },
        ],
    });

    // Force sync to update table structure (only in development)
    if (process.env.NODE_ENV === 'development') {
        SalaryGenerationDetail.sync({ alter: true }).then(() => {
            console.log('SalaryGenerationDetail table synced successfully');
        }).catch(err => {
            console.error('Error syncing SalaryGenerationDetail table:', err);
        });
    }

    return SalaryGenerationDetail;
};
