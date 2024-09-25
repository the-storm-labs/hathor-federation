const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const members = ["0xf312cCBb3D73f43e536b520195Ac3215Bc56edFA","0xCC3CF44397Daa4572CDb20f72dee5700507454E4","0xc818272FF7451a9d415D53D12CB3c59CAA6e3690"];
const owner ="0xe1c3ffE5324bc7d49Dc2E8F3a7Ccc894D1be5ECb";

module.exports = buildModule("HathorfederationModule", (m) => {
  const Members = m.getParameter("members", members);
  const Owner = m.getParameter("owner", owner);
 

  const HathorFederation = m.contract("HathorFederation", [Members,Owner], {
      });

  return { HathorFederation };
});
