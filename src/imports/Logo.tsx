import React from 'react';
import { imgNome, imgSimbolo } from "./svg-1t29k";

function Nome() {
  return (
    <div className="absolute bottom-0 left-[34.14%] right-0 top-0" data-name="nome">
      <img className="block max-w-none size-full" src={imgNome} />
    </div>
  );
}

function Simbolo() {
  return (
    <div className="absolute bottom-[28.27%] left-0 right-[72.96%] top-[5.4%]" data-name="simbolo">
      <img className="block max-w-none size-full" src={imgSimbolo} />
    </div>
  );
}

const Logo = React.forwardRef<HTMLDivElement>((props, ref) => {
  return (
    <div ref={ref} className="relative size-full" data-name="logo" {...props}>
      <Nome />
      <Simbolo />
    </div>
  );
});
Logo.displayName = "Logo";

export default Logo;