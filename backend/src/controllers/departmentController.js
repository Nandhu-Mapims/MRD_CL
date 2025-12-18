const Department = require('../models/Department');

exports.createDepartment = async (req, res) => {
  try {
    const { name, code } = req.body;
    const existing = await Department.findOne({ $or: [{ name }, { code }] });
    if (existing) {
      return res.status(400).json({ message: 'Department with same name or code exists' });
    }
    const dept = await Department.create({ name, code });
    res.status(201).json(dept);
  } catch (err) {
    console.error('createDepartment error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, isActive } = req.body;
    const dept = await Department.findByIdAndUpdate(
      id,
      { name, code, isActive },
      { new: true }
    );
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    res.json(dept);
  } catch (err) {
    console.error('updateDepartment error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    await Department.findByIdAndDelete(id);
    res.status(204).send();
  } catch (err) {
    console.error('deleteDepartment error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.listDepartments = async (_req, res) => {
  try {
    const depts = await Department.find().sort({ name: 1 });
    res.json(depts);
  } catch (err) {
    console.error('listDepartments error', err);
    res.status(500).json({ message: 'Server error' });
  }
};


