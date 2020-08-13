const DeviceCapabilityTable = db.defineTable('DeviceCapability', {
  columns: {
    Id: db.ColTypes.int(11).notNull().primaryKey().autoIncrement(),
    Device: db.ColTypes.int(11).notNull().index(),
    Value: db.ColTypes.varchar(100).notNull(),
  },
  keys: [
    db.KeyTypes.foreignKey('Device').references('Device', 'Id').cascade(),
  ],
});

const DeviceCapability = {
  async InsertJson(device, message) {
    await db.pquery("DELETE FROM DeviceCapability WHERE Device = ?", [device]);

    let rows = [];

    const messagearray = Object.entries(JSON.parse(message));
    messagearray.forEach((element) => {
      const key = element[0];
      const value = element[1];

      if (Array.isArray(value))
        value.forEach((subvalue) => {
          let valuestr = `${key}/[$]`;
          if (subvalue)
            if (subvalue.startsWith(":"))
              valuestr = `${key}/[$]${subvalue}`;
            else
              valuestr = `${key}/[$]/${subvalue}`;
          rows.push(valuestr);
        });
    });

    for (let i = 0; i < rows.length; i++)
      await DeviceCapabilityTable.insert({ Device: device, Value: rows[i] });
  },

  GetByDeviceId(deviceid) {
    return DeviceCapabilityTable.select(['Value'], 'WHERE Device = ? ORDER BY Id', [deviceid])
      .then(rows => {
        rows.forEach(row => {
          if (row.Value.includes(":")) {
            const parts = row.Value.split(":");
            row.Value = parts[0];
            row.Items = parts[1].split("/");
          }
        });
        return Promise.resolve(rows);
      })
  },

  GetCapabilityComponentByStatAndCmd(devicecapabilities) {

    let devicecomponents = {};

    if (devicecapabilities)
      devicecapabilities.forEach(devicecapability => {
        const devicecapabilityvalue = devicecapability.Value;
        const devicecapmatch = devicecapabilityvalue.match(/^stat\/\[\$\]\/?([a-z0-9]*)$/);
        if (devicecapmatch) {
          const componentname = devicecapmatch[1];
          devicecomponents[componentname] = [];
        }
      });

    if (devicecapabilities)
      devicecapabilities.forEach(devicecapability => {
        const devicecapabilityvalue = devicecapability.Value;
        const devicecapmatch = devicecapabilityvalue.match(/^cmd\/\[\$\]\/?([a-z0-9]*)$/);
        if (devicecapmatch) {
          const componentname = devicecapmatch[1];
          if (componentname in devicecomponents)
            if (devicecapability.Items)
              devicecapability.Items.forEach(capitem => {
                devicecomponents[componentname].push(capitem);
              })
        }
      });

    return devicecomponents;
  },

  GetCapabilityComponentByCmdOnly(devicecapabilities) {

    let devicecomponents = {};
    let devicecomponentscmdonly = {};

    if (devicecapabilities)
      devicecapabilities.forEach(devicecapability => {
        const devicecapabilityvalue = devicecapability.Value;
        const devicecapmatch = devicecapabilityvalue.match(/^stat\/\[\$\]\/?([a-z0-9]*)$/);
        if (devicecapmatch) {
          const componentname = devicecapmatch[1];
          devicecomponents[componentname] = [];
        }
      });

    if (devicecapabilities)
      devicecapabilities.forEach(devicecapability => {
        const devicecapabilityvalue = devicecapability.Value;
        const devicecapmatch = devicecapabilityvalue.match(/^cmd\/\[\$\]\/?([a-z0-9]*)$/);
        if (devicecapmatch) {
          const componentname = devicecapmatch[1];
          if (!(componentname in devicecomponents)) {
            devicecomponentscmdonly[componentname] = [];
            if (devicecapability.Items)
              devicecapability.Items.forEach(capitem => {
                devicecomponentscmdonly[componentname].push(capitem);
              })
          }
        }
      });

    return devicecomponentscmdonly;
  },

  GetCapabilityComponentByTele(devicecapabilities) {

    let devicecomponents = {};

    if (devicecapabilities)
      devicecapabilities.forEach(devicecapability => {
        const devicecapabilityvalue = devicecapability.Value;
        const devicecapmatch = devicecapabilityvalue.match(/^tele\/\[\$\]\/?([a-z0-9]*)$/);
        if (devicecapmatch) {
          const componentname = devicecapmatch[1];
          devicecomponents[componentname] = [];
        }
      });

    return devicecomponents;
  },

  HasConfigCapability(devicecapabilities) {

    let result = false;

    if (devicecapabilities)
      devicecapabilities.forEach(devicecapability => {
        if (devicecapability.Value.startsWith("cfg"))
          result = true;
      });
    return result;
  },

};

module.exports = DeviceCapability;