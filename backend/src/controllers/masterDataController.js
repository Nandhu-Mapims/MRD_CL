const MasterData = require('../models/MasterData');

const DEFAULT_DESIGNATIONS = ['Doctor', 'Chief', 'MRD Staff', 'Lab Technician', 'Nurse', 'Pharmacist', 'Unit Chief', 'Other'];
const DEFAULT_WARDS = ['A1', 'A2', 'B1', 'B2', 'C1', 'ICU', 'CCU', 'Maternity'];
const DEFAULT_UNITS = ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4'];

async function getOrCreateMasterData() {
  let doc = await MasterData.findOne({ key: 'default' });
  if (!doc) {
    doc = await MasterData.create({
      key: 'default',
      designations: DEFAULT_DESIGNATIONS,
      wards: DEFAULT_WARDS,
      units: DEFAULT_UNITS,
    });
  }
  return doc;
}

exports.getMasterData = async (req, res) => {
  try {
    const doc = await getOrCreateMasterData();
    res.json({
      designations: doc.designations || DEFAULT_DESIGNATIONS,
      wards: doc.wards || DEFAULT_WARDS,
      units: doc.units || DEFAULT_UNITS,
    });
  } catch (err) {
    console.error('getMasterData error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateMasterData = async (req, res) => {
  try {
    const { designations, wards, units } = req.body;
    let doc = await MasterData.findOne({ key: 'default' });
    if (!doc) {
      doc = await MasterData.create({
        key: 'default',
        designations: designations || DEFAULT_DESIGNATIONS,
        wards: wards || DEFAULT_WARDS,
        units: units || DEFAULT_UNITS,
      });
    } else {
      if (Array.isArray(designations)) doc.designations = designations.filter(Boolean).map((s) => String(s).trim());
      if (Array.isArray(wards)) doc.wards = wards.filter(Boolean).map((s) => String(s).trim());
      if (Array.isArray(units)) doc.units = units.filter(Boolean).map((s) => String(s).trim());
      await doc.save();
    }
    res.json({
      designations: doc.designations || [],
      wards: doc.wards || [],
      units: doc.units || [],
    });
  } catch (err) {
    console.error('updateMasterData error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getWardsAndUnitsForForms = async (req, res) => {
  try {
    const doc = await MasterData.findOne({ key: 'default' }).lean();
    const wards = (doc?.wards && doc.wards.length > 0) ? doc.wards : DEFAULT_WARDS;
    const units = (doc?.units && doc.units.length > 0) ? doc.units : DEFAULT_UNITS;
    res.json({ wards, units });
  } catch (err) {
    console.error('getWardsAndUnitsForForms error', err);
    res.json({ wards: DEFAULT_WARDS, units: DEFAULT_UNITS });
  }
};
