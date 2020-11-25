import EventEmitter from 'events';

let serial = null;
let studio = null;

function loadSerialPort ()
{
	try
	{
		// written like this to work with webpack when target is browser
		return eval ('require(\'serialport\')');
	}
	catch (e)
	{	
		studio.workspace.error ('serialport: serialport is not available '+e.message);
		return {
			list: function ()
			{
				return [
				];
			}
		};
	}
}

export class SerialPort extends EventEmitter {
	async connect (address, baudRate)
	{ 
		if (studio.system.platform () === 'electron')
		{
			this.serial = new serial(address,{
				baudRate
			},(err)=>{
				if(err){
					this.emit ('error', err);
				}
				else
				{
					this.serial.on('data', (data) => {
						this.emit ('data', data);
					});
					this.serial.on('error', (err) => {
						this.emit ('error', err);
					});
					this.serial.on('close', () => {
						this.emit ('close');	
					});
					this.emit('connected');
				}
			});

		}
		else
		{	
			this.portConnect = await navigator.serial.requestPort();
			// API changes, so we take into account both versions
			await this.portConnect.open({ baudRate: baudRate || 115200, baudrate: baudRate || 115200 });
			this.reader = this.portConnect.readable.getReader();
			this.writer = this.portConnect.writable.getWriter();
			this.emit('connected');
			
			do {
				try
				{
					let {done,value} = await this.reader.read();
					if(done)
					{
						break;
					}
					else
					{
						this.emit ('data', value);
					}
				}
				catch (e)
				{
					this.emit ('error', e);
					break;
				}
				/* eslint-disable-next-line no-constant-condition */
			} while(true);
			//this.emit ('close');
		}
	}

	write (data) {
		if (studio.system.platform() === 'electron')
		{
			this.serial.write (data);
		}
		else
		{
			if (this.writer) {
				return this.writer.write(data);
			}
		}
	}

	async close(){
		if(studio.system.platform() === 'electron')
		{
			this.serial.close();
		}
		else{
			await this.reader.cancel();
			await this.writer.abort();
			await this.portConnect.close();
		}
	}
}

let serialport = {
	list ()
	{
		if (studio.system.platform () === 'electron')
		{
			return serial.list ();
		}
		else
		{
			return [];
		}
	},
	isAvailable () {
		return serial != null || navigator.serial != null;
	},
	SerialPort
};

export function setup (options, imports, register) {
	studio = imports;
	serial = loadSerialPort();
	register (null, {
		serialport: serialport
	});
}