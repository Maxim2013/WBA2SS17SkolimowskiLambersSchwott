//var bcrypt   = require('bcrypt-nodejs');
module.exports.init = function(schema, Schema){

  var User = schema.define('users', {
    name:         { type: String, length: 32 },
    gmid:          { type: String, length: 16 },
    matrNr:          { type: String, length: 16 },
    email:          { type: String, length: 16 },
    password:          { type: String },
    approved:     { type: Boolean,    default: false },
    joinedAt:     { type: Date,    default: function () { return new Date;} }
  });

  var Equipment = schema.define('Equipment', {
    name:     { type: String, length: 64 },
    desc:   { type: Schema.Text },
    date:      { type: Date,    default: function () { return new Date;} },
    available: { type: Number, default: 1, index: true },
    specification:   { type: Schema.Text }
  });

  var Message = schema.define('Message', {
    title:     { type: String, length: 64 },
    content:   { type: Schema.Text },
    date:      { type: Date,    default: function () { return new Date;} },
    ack: { type: Boolean, default: false, index: true }
  });

  var Loan = schema.define('Loan', {
    beginDate:     { type: Date },
    endDate:   { type: Date },
    requestDate:      { type: Date,    default: function () { return new Date;} },
    approved: { type: Boolean,    default: false },
    returnDate: { type: Date }
  });

  var Section = schema.define('Section', {name: { type: String, index: true }});
  var Category = schema.define('Category', {name: { type: String, index: true }});
  var Group = schema.define('Group', {name: { type: String, index: true }});

  //relationships
  Group.hasMany(User,   {as: 'users',  foreignKey: 'groupId'});
  User.belongsTo(Group,   {as: 'usergroup',  foreignKey: 'groupId'});
  User.hasMany(Message,   {as: 'sendMessages',  foreignKey: 'senderId'});
  Message.belongsTo(User,   {as: 'sender',  foreignKey: 'senderId'});
  User.hasMany(Message,   {as: 'receivedMessages',  foreignKey: 'receiverId'});
  Message.belongsTo(User,   {as: 'receiver',  foreignKey: 'receiverId'});
  Loan.hasMany(Message,   {as: 'messages',  foreignKey: 'loanId'});
  Message.belongsTo(Loan,   {as: 'refLoan',  foreignKey: 'loanId'});
  Section.hasMany(Equipment,   {as: 'assignedEquipments',  foreignKey: 'sectionId'});
  Equipment.belongsTo(Section, {as: 'section', foreignKey: 'sectionId'});
  Category.hasMany(Equipment,   {as: 'assignedCategories',  foreignKey: 'categoryId'});
  Equipment.belongsTo(Category, {as: 'category', foreignKey: 'categoryId'});
  Equipment.hasAndBelongsToMany('loans');
  User.hasMany(Loan,   {as: 'requestedLoans',  foreignKey: 'requestorId'});
  Loan.belongsTo(User,   {as: 'requestor',  foreignKey: 'requestorId'});

  schema.automigrate();

}