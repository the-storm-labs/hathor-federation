const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const members = ["0x6cd8B81f8aBE38e028C58347d5c25791cD012cE0","0xdaC1B4fC75E8792594CabA54a16beE94B4a700e5","0xa50339B4413d5854291e93cACF95599a7265bE59","0x225f64996Cd783E5acE8F5A20cdD7871304F1130","0xcAfbbb39c25adF1AE8859a0197ab7CBD2cE78F56","0xE245a452480a93D7AaCf040E8744964B714C6C4a","0x6279096C4988bDa648Ab3c419204bf41aBf45f09"];
const owner ="0xCC3CF44397Daa4572CDb20f72dee5700507454E4";

module.exports = buildModule("HathorfederationModule", (m) => {
  const Members = m.getParameter("members", members);
  const Owner = m.getParameter("owner", owner);
 

  const HathorFederation = m.contract("HathorFederation", [Members,Owner], {
      });

  return { HathorFederation };
});
