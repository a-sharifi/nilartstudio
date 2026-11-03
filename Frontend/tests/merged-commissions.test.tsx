import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import CommissionsPage from '../src/design/CommissionsPage';
afterEach(cleanup);
it('keeps the artwork introduction and opens notebooks without leaving the shared page',()=>{
 const navigate=vi.fn();render(<CommissionsPage language={1} signedIn live onNavigate={navigate} notebookContent={<section id="notebook-request">Notebook specifications</section>}/>);
 expect(screen.getAllByRole('button',{name:'Start a commission'})[0]).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:/Custom notebook & sketchbook/}));
 expect(screen.getByRole('link',{name:/Build your notebook/}).getAttribute('href')).toBe('#notebook-request');
 expect(screen.getByText('Notebook specifications').closest('[hidden]')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:/Custom artwork.*standalone/}));
 fireEvent.click(screen.getAllByRole('button',{name:'Start a commission'})[0]);
 expect(navigate).toHaveBeenCalledWith('Start request','/en/commissions/new/references');
});
it('opens the notebook branch directly for notebook entry links',()=>{
 render(<CommissionsPage language={1} signedIn={false} live onNavigate={vi.fn()} initialKind="notebook" notebookContent={<section>Notebook specifications</section>}/>);
 expect(screen.getByRole('button',{name:/Custom notebook & sketchbook/}).getAttribute('aria-pressed')).toBe('true');
 expect(screen.getByRole('link',{name:/Build your notebook/})).toBeTruthy();
 expect(screen.getByText('Notebook specifications').closest('[hidden]')).toBeNull();
});
it('introduces both order types and opens notebook ordering from the hero action',()=>{
 render(<CommissionsPage language={0} signedIn live onNavigate={vi.fn()} notebookContent={<section id="notebook-request">فرم دفتر</section>}/>);
 expect(screen.getByRole('heading',{level:1}).textContent).toContain('نقاشی یا دفتر اختصاصی');
 const action=screen.getByRole('link',{name:'سفارش دفتر سفارشی'});
 expect(action.getAttribute('href')).toBe('#notebook-request');
 fireEvent.click(action);
 expect(screen.getByText('فرم دفتر').closest('[hidden]')).toBeNull();
 expect(screen.queryByRole('link',{name:'آثار آماده را ببینید'})).toBeNull();
});
