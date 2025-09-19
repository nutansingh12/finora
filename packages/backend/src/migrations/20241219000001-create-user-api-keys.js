'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_api_keys', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'user_id',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      provider: {
        type: Sequelize.ENUM('alpha_vantage', 'yahoo_finance', 'iex_cloud'),
        allowNull: false
      },
      apiKey: {
        type: Sequelize.TEXT,
        allowNull: false,
        field: 'api_key'
      },
      keyName: {
        type: Sequelize.STRING(100),
        allowNull: true,
        field: 'key_name'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        field: 'is_active'
      },
      requestsUsed: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        field: 'requests_used'
      },
      dailyRequestsUsed: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        field: 'daily_requests_used'
      },
      requestLimit: {
        type: Sequelize.INTEGER,
        defaultValue: 500,
        allowNull: false,
        field: 'request_limit'
      },
      dailyRequestLimit: {
        type: Sequelize.INTEGER,
        defaultValue: 500,
        allowNull: false,
        field: 'daily_request_limit'
      },
      lastUsedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'last_used_at'
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'expires_at'
      },
      registrationId: {
        type: Sequelize.STRING,
        allowNull: true,
        field: 'registration_id'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'updated_at'
      }
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('user_api_keys', ['user_id', 'provider'], {
      name: 'idx_user_api_keys_user_provider'
    });

    await queryInterface.addIndex('user_api_keys', ['provider', 'is_active'], {
      name: 'idx_user_api_keys_provider_active'
    });

    await queryInterface.addIndex('user_api_keys', ['expires_at'], {
      name: 'idx_user_api_keys_expires_at'
    });

    await queryInterface.addIndex('user_api_keys', ['last_used_at'], {
      name: 'idx_user_api_keys_last_used_at'
    });

    await queryInterface.addIndex('user_api_keys', ['registration_id'], {
      name: 'idx_user_api_keys_registration_id'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('user_api_keys', 'idx_user_api_keys_user_provider');
    await queryInterface.removeIndex('user_api_keys', 'idx_user_api_keys_provider_active');
    await queryInterface.removeIndex('user_api_keys', 'idx_user_api_keys_expires_at');
    await queryInterface.removeIndex('user_api_keys', 'idx_user_api_keys_last_used_at');
    await queryInterface.removeIndex('user_api_keys', 'idx_user_api_keys_registration_id');

    // Drop the table
    await queryInterface.dropTable('user_api_keys');
  }
};
